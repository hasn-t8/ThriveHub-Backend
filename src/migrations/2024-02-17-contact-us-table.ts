import { query } from "express-validator";
import { Pool } from "pg";

//migration to add contact us table

export const up =async(pool:Pool) => {

    const client = await pool.connect(); //connect to database


    try{
        await client.query("Begin");
        //NOw create table

        await client.query(`
           CREATE TABLE contact_us(
           id SERIAL PRIMARY KEY,
           name VARCHAR(255) NOT NULL,
           email VARCHAR(255) NOT NULL,
           message TEXT NOT NULL,
           user_id INTEGER, -- Added user_id column
           business_id INTEGER, -- Added business_id column
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("Table `contact_us` created successfully. ");
          await client.query("COMMIT");
        
    } catch(error) {
        await client.query("ROLLBACK");
        console.error("Error creating 'contact_us tabel",(error as Error).message);
        throw error;
    } finally{
        client.release();
    }
    
};

//migration to drop the database

export const down = async (pool:Pool) =>{

    const client = await pool.connect();
    try{
        await client.query("BEGIN");

        await client.query("Drop Table if exists contact_us");

        console.log("Table Drop Successfully.");

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error dropping contact_us page",(error as Error).message);
        throw error;

    } finally{
        client.release();
    }
};