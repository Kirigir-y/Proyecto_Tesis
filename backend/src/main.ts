import { ConfigService } from '@nestjs/config'; //lee variables de entorno
import { NestFactory } from '@nestjs/core'; // Crea la aplicacion
import { AppModule } from './app.module'; //Modulo principal
import morgan from 'morgan'; //Middleware para ver las peticiones
import { CORS } from './constants'; //Configuracion CORS

async function bootstrap() {
  const app = await NestFactory.create(AppModule); //Crea la aplicacion

  app.use(morgan('dev')); //Middleware para ver las peticiones

  const configService = app.get(ConfigService); //Obtiene la configuracion

  app.enableCors(CORS); //Habilita el CORS

  app.setGlobalPrefix('api'); //Prefijo global

  await app.listen(+configService.get('PORT')); //Arranca el servidor
  console.log(`Application running on: ${await app.getUrl()}`); //Muestra la URL
}
bootstrap();
