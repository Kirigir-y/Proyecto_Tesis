const bcrypt = require('bcrypt');

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const enfermeraHash = await bcrypt.hash('enfermera123', 10);
  const tensHash = await bcrypt.hash('tens123', 10);
  const cuidadorHash = await bcrypt.hash('cuidador123', 10);

  console.log(`
INSERT INTO users (id, username, email, password, role) VALUES
(gen_random_uuid(), 'admin', 'admin@hospital.com', '${adminHash}', 'admin'),
(gen_random_uuid(), 'enfermera_ana', 'ana@hospital.com', '${enfermeraHash}', 'Enfermero'),
(gen_random_uuid(), 'tens_juan', 'juan@hospital.com', '${tensHash}', 'TENS'),
(gen_random_uuid(), 'cuidador_pedro', 'pedro@hospital.com', '${cuidadorHash}', 'cuidador');
  `);
}

main();
