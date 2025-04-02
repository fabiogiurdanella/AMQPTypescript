# AMQPTypescript

AMQPTypescript è una libreria per semplificare l'interazione con broker AMQP come RabbitMQ utilizzando TypeScript.

## Caratteristiche
- Connessione semplice a broker AMQP.
- Supporto per pubblicazione e consumo di messaggi.
- Configurazione tramite file `.env`.

## Requisiti
- Node.js >= 14.x
- Un broker AMQP (es. RabbitMQ)

## Installazione
1. Clona il repository:
   ```bash
   git clone <repository-url>
   cd AMQPTypescript
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Crea un file `.env` nella root del progetto e specifica le seguenti variabili:
   ```
   AMQP_HOST=<host>
   AMQP_PORT=<port>
   AMQP_USER=<user>
   AMQP_PASSWORD=<password>
   ```

## Configurazione
Specificare questi dettagli in un file `.env` correttamente scritto che è stato aggiunto al progetto. Le seguenti variabili di ambiente verranno lette dal file `.env`:
- AMQP_HOST
- AMQP_PORT
- AMQP_USER
- AMQP_PASSWORD