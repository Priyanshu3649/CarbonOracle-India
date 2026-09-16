// Service to normalize CSV headers to match the expected schema
// Expected: longitude, latitude, distance_from_tree, diameter_cm, tree_height_m

export function normalizeCsvRow(row: any): any {
  const normalized: any = {};
  
  // Normalize Keys (lowercase, remove spaces/special characters including underscores)
  const keys = Object.keys(row);
  for (const key of keys) {
    const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    
    // Map common variations to internal fields
    if (['lon', 'long', 'longitude'].includes(cleanKey)) {
      normalized.longitude = parseFloat(row[key]);
    } else if (['lat', 'latitude'].includes(cleanKey)) {
      normalized.latitude = parseFloat(row[key]);
    } else if (['diameter', 'dbh', 'diametercm', 'dia', 'trunkdiameter', 'trunkdiametercm'].includes(cleanKey)) {
      normalized.diameter_cm = parseFloat(row[key]);
    } else if (['height', 'treeheight', 'treeheightm', 'heightm'].includes(cleanKey)) {
      normalized.tree_height_m = parseFloat(row[key]);
    } else if (['treeheightcm', 'heightcm'].includes(cleanKey)) {
      normalized.tree_height_m = parseFloat(row[key]) / 100;
    } else if (['distance', 'distancefromtree', 'distancem', 'disttree'].includes(cleanKey)) {
      normalized.distance_from_tree_m = parseFloat(row[key]);
    } else if (['species', 'speciesname', 'commonname'].includes(cleanKey)) {
      normalized.raw_species = row[key];
    }
  }

  return normalized;
}

export function validateTreeData(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.diameter_cm || data.diameter_cm <= 0) errors.push('Invalid DBH');
  if (!data.tree_height_m || data.tree_height_m <= 0) errors.push('Invalid Height');
  if (data.latitude === undefined || data.latitude < -90 || data.latitude > 90) errors.push('Invalid Latitude');
  if (data.longitude === undefined || data.longitude < -180 || data.longitude > 180) errors.push('Invalid Longitude');
  
  return errors;
}
