# Quickstart
1. Run Postgres DB   
2. `` npm run migrate:up``

# Deployment
### Check the .env
### Build the image and Run the container
``` docker-compose -f docker-compose-prod.yml up --build -d --remove-orphans ```
### To seed 
``` docker exec -it container_name sh -c "npm run seed" ```