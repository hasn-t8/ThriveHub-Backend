cc# Development  
1. Run Postgres DB with `docker-compose up -d`   
2. ` npm install `
3. `npm run migrate:up`
4. ` npm run seed `
5. ` npm run dev`

----- 
# ONLY For Deployment 
### Check the .env
### Build the image and run the container
``` docker-compose -f docker-compose-prod.yml up --build -d --remove-orphans ``` 
### Run the container
``` docker-compose -f docker-compose-prod.yml up  -d --remove-orphans ```
### To seed 
``` docker exec -it container_name sh -c "npm run seed" ```
### To connect to db use the port : 6432

### SSL - First Deployment
#### Obtain Initial Certificates   
Start the services without the certbot container running yet:   
``` docker-compose -f docker-compose-prod.yml up -d nginx app postgres docker-gen ```
Run Certbot interactively to issue certificates for the domain:
``` docker-compose -f docker-compose-prod.yml run certbot certonly --webroot --webroot-path=/var/www/certbot -d th-api.ebsycloud.com ```

#### Replace th-api.ebsycloud.com with your actual domain.
Verify that the certificates are generated in ./certbot/conf/live/th-api.ebsycloud.com/.

### Test HTTPS
Restart Nginx to load the new configuration:

``` docker-compose restart nginx ```   
Access your API at https://th-api.ebsycloud.com.



