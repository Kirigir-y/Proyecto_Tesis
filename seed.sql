INSERT INTO users (id, username, email, password, role) VALUES
(gen_random_uuid(), 'admin', 'admin@hospital.com', '$2b$10$BPZpXCGqkIFSrhUtRcoAnuJKWtEVmJDVJXopMwmFAesjILax2QViC', 'admin'),
(gen_random_uuid(), 'enfermera', 'ana@hospital.com', '$2b$10$NrogcY1l5K90V8bA9cqFhOb04USbRNp96.YGqKYYyhUzooJB07oHK', 'Enfermero'),
(gen_random_uuid(), 'tens', 'juan@hospital.com', '$2b$10$wBSl.Xfclr5HApefeSuk7OFoj7ZnCk2dvt9d8JItJls29h3CAPNjW', 'TENS'),
(gen_random_uuid(), 'cuidador', 'pedro@hospital.com', '$2b$10$1wNcCnm2gQ19ReRph.t9h.QtCh/6udmyxj2WMSDVQ/9S3VjQ3rm9C', 'cuidador')
ON CONFLICT (username) DO NOTHING;
