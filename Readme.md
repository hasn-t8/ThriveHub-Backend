# Quickstart
1. Run Postgres DB   
2. `` npm run migrate:up``

# Deployment
### Check the .env
### Build the image
``` docker build --no-cache -t api_server_v3-app .  ```
### Run the container
``` docker-compose -f docker-compose-prod.yml up  -d --remove-orphans ```
### To seed 
``` docker exec -it container_name sh -c "npm run seed" ```
### To connect to db use the port : 6432