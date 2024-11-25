# Quickstart
1. Run Postgres DB   
2. `` npm run migrate:up``
3. `` npm run seed ``

# Deployment
### Check the .env
### Build the image
``` docker build --no-cache -t api_server_v3-app .  ```
### Run the container
``` docker-compose -f docker-compose-prod.yml up  -d --remove-orphans ```
### To seed 
``` docker exec -it container_name sh -c "npm run seed" ```
### To connect to db use the port : 6432

### Traefik
#### Initialize Traefik Storage
``` 
mkdir -p ./letsencrypt
touch ./letsencrypt/acme.json
chmod 600 ./letsencrypt/acme.json 
```   
#### Tips
1. Use Let's Encrypt Staging for Testing: To avoid hitting Let's Encrypt rate limits during setup, use the staging endpoint:


``` yaml
- "--certificatesresolvers.myresolver.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```  

2. Secure the Traefik Dashboard: In production, disable the insecure dashboard or secure it with authentication.

3. DNS Configuration: Ensure your domain (your-domain.com) points to your VPS's public IP address.


