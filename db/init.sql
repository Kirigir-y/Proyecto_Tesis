SELECT 'CREATE DATABASE basedatostesis' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'basedatostesis')\gexec