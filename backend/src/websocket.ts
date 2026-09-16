import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import prisma from './prisma';
import { calculateCarbon } from './services/calculationService';
import crypto from 'crypto';
import { normalizeCsvRow, validateTreeData } from './services/parserService';

export let activeRoverPlotId = "demo-rover-plot-01";
export let activeRoverSpeciesId = "29c22660-ceb0-4298-bf99-fc30fbfc13c3";

export function setActiveRoverConfig(plotId: string, speciesId: string) {
  activeRoverPlotId = plotId;
  activeRoverSpeciesId = speciesId;
}

function generateTreeId(plotId: string, lat: number, lon: number) {
  const roundedLat = Math.round(lat * 1000);
  const roundedLon = Math.round(lon * 1000);
  const hash = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TREE_${plotId.substring(0,4)}_${roundedLat}_${roundedLon}_${hash}`;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected (ESP or Browser)');

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Default backend assignments for rover data
        const plot_id = activeRoverPlotId;
        const species_id = activeRoverSpeciesId;

        // Add defaults back into data object for parser
        data.plot_id = plot_id;
        data.species_id = species_id;

        // Basic validation of incoming schema (only 4 fields from hardware)
        if (data.latitude == null || data.longitude == null || data.diameter_cm == null || data.tree_height_m == null) {
          return ws.send(JSON.stringify({ error: 'Missing required fields' }));
        }

        // Validate tree data rules
        const row = normalizeCsvRow(data);
        const validationErrors = validateTreeData(row);
        if (validationErrors.length > 0) {
          return ws.send(JSON.stringify({ error: 'Validation failed', details: validationErrors }));
        }

        const speciesUrl = await prisma.species.findUnique({ where: { id: data.species_id } });
        if (!speciesUrl) {
          return ws.send(JSON.stringify({ error: 'Invalid species ID' }));
        }

        const calcs = calculateCarbon(row.diameter_cm, row.tree_height_m, speciesUrl.wood_density_g_cm3);

        let tree = await prisma.tree.findUnique({
          where: {
            latitude_longitude: { latitude: row.latitude, longitude: row.longitude }
          }
        });

        if (!tree) {
          tree = await prisma.tree.create({
            data: {
              internal_tree_id: generateTreeId(data.plot_id, row.latitude, row.longitude),
              plot_id: data.plot_id,
              species_id: data.species_id,
              latitude: row.latitude,
              longitude: row.longitude,
              distance_from_tree_m: row.distance_from_tree_m || null
            }
          });
        }

        const measurement = await prisma.treeMeasurement.create({
          data: {
            tree_id: tree.id,
            diameter_cm: row.diameter_cm,
            tree_height_m: row.tree_height_m,
            wood_density_g_cm3: speciesUrl.wood_density_g_cm3,
            ...calcs,
            data_source: 'rover_ws'
          }
        });

        const plot = await prisma.plot.findUnique({ where: { id: data.plot_id } });
        const record = { ...tree, ...measurement, plot, species: speciesUrl };

        console.log(`Saved new tree via WebSocket: ${tree.internal_tree_id}`);

        const successMessage = JSON.stringify({ type: 'NEW_TREE', data: record });

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(successMessage);
          }
        });
      } catch (error) {
        console.error('WebSocket message processing error:', error);
        ws.send(JSON.stringify({ error: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return wss;
}
