export function calculateCarbon(dbh: number, height: number, wd: number) {
  // AGB_kg = exp(-2.409 + 0.9522 * ln(D^2 * H * WD))
  const agb_kg = Math.exp(-2.409 + 0.9522 * Math.log(Math.pow(dbh, 2) * height * wd));
  
  // configurable carbon fraction could be passed as an argument, defaulting to 0.47
  const carbonFraction = 0.47;
  const agc_kg = agb_kg * carbonFraction;
  
  // root-to-shoot approximation
  const bgb_kg = agb_kg * 0.26;
  const bgc_kg = bgb_kg * carbonFraction;
  
  const total_carbon_kg = agc_kg + bgc_kg;
  const co2e_kg = total_carbon_kg * 3.667;

  return {
    agb_kg: parseFloat(agb_kg.toFixed(4)),
    agc_kg: parseFloat(agc_kg.toFixed(4)),
    bgb_kg: parseFloat(bgb_kg.toFixed(4)),
    bgc_kg: parseFloat(bgc_kg.toFixed(4)),
    total_carbon_kg: parseFloat(total_carbon_kg.toFixed(4)),
    co2e_kg: parseFloat(co2e_kg.toFixed(4))
  };
}
