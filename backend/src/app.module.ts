import { Module } from '@nestjs/common'; //Modulo de nest
import { ConfigModule } from '@nestjs/config'; //Modulo de configuracion
import { TypeOrmModule } from '@nestjs/typeorm'; //Modulo de typeorm
import { UsersModule } from './users/users.module'; //Modulo de usuarios
import { AuthModule } from './auth/auth.module'; //Modulo de autenticacion
import { ShiftReportsModule } from './shift-reports/shift-reports.module'; //Modulo de reportes de turno
import { CalendarModule } from './calendar/calendar.module'; //Modulo de calendario
import { ResidentsModule } from './residents/residents.module'; //Modulo de residentes
import { MedicationsModule } from './medications/medications.module'; //Modulo de medicamentos
import { MessagesModule } from './messages/messages.module'; //Modulo de mensajeria en tiempo real
import { VisitLogsModule } from './visit-logs/visit-logs.module'; //Modulo de visitas y salidas de residentes
import { SuppliesModule } from './supplies/supplies.module'; //Modulo de inventario de utiles de aseo (solo cuidadores)
import { HealthController } from './health.controller'; //Ruta publica para que la app encuentre el servidor

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV?.trim()}.env`,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
    AuthModule,
    ShiftReportsModule,
    CalendarModule,
    ResidentsModule,
    MedicationsModule,
    MessagesModule,
    VisitLogsModule,
    SuppliesModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
