import { Request, Response } from "express";
import sql from "../../db";
import { ApiKey, Permission, entity_data_is_valid } from "../../utils";
import { generic_error_message, generic_server_error_message } from "../../Config";

export async function get_entities(req: Request<{}, {}, { key: ApiKey }>, res: Response) {
    try {
        const { project } = req.body.key
        const data = await sql` select * from entity where project=${project} `
        return res.status(200).send({
            data
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send()
    }
} 

export async function create_entity( req: Request<{}, {}, { name:string, schema:Record<string, string>, key: ApiKey }>, res: Response ){
    try {
        const { key:{ permissions, project }, name, schema } = req.body
        if(!name || !schema || name==="" || typeof schema!=="object") return res.status(400).send({
            message:generic_error_message
        })
        const parsed_permissions = JSON.parse(permissions) as Permission
        if(!parsed_permissions.create_permission) return res.status(403).send({
            message:"Key does not have permission to create entities"
        })
        const [duplicate_entity] = await sql` select name from entity where name=${name} and project=${project} `
        if(duplicate_entity) return res.status(409).send({
            message:"An entity with the same name already exists in the same project"
        })
        const fields = Object.keys(schema)
        const types = Object.values(schema)
        const { status, message } = entity_data_is_valid( fields, types )
        if(!status) return res.status(400).send({ message })
        await sql` 
            insert into entity(name, project, schema) 
            values( ${name}, ${project}, ${JSON.stringify(schema)} ) 
        `
        return res.status(201).send()
    } catch (err) {
        console.log(`Error in create entity ${err}`)
        return res.status(500).send({
            message:generic_server_error_message
        })
    }
}

export async function update_entity( req:Request<{name : string}, {}, { name:string, key:ApiKey}>, res:Response){
    try {
        const { key:{ project, permissions } } = req.body
        if(!req.body.name) return res.status(400).send({
            message:generic_error_message
        })
        const parsed_permissions = JSON.parse(permissions) as Permission
        if (!parsed_permissions.write_permission) return res.status(403).send({
            message : "Key does not have permission to update entities"
        })
        const { name } = req.params
        const [entity] = await sql<{id:string}[]>` select id from entity where name=${name} and project=${project} `
        if(!entity) return res.status(404).send({
            message:"Entity not found"
        })
        const [potential_duplicate] = await sql` select name from entity where project=${project} `
        if(potential_duplicate) return res.status(409).send({
            message:`An entity named ${req.body.name} already exists in this project`
        })
        await sql `update entity set name=${req.body.name} where id=${entity.id}`
        return res.status(200).send()
    } catch (err) {
        console.log(`Error in update entity ${err}`)
        return res.status(500).send({
            message:generic_server_error_message
        })
    }
}

export async function delete_entity( req: Request<{ name: string }, {trash? : boolean}, { key: ApiKey }>, res: Response ){
    try {
        const { key: { project, permissions }  } = req.body
        const { name } = req.params
        const parsed_permissions = JSON.parse(permissions) as Permission
        if ( !parsed_permissions.delete_permission ) return res.status(403).send({
            message:"Key does not have permission to delete entities"
        })
        if(!name) return res.status(400).send({
            message:generic_error_message
        })
        const [entity] = await sql<{id:string}[]>`select id from entity where name=${name} and project=${project}`
        if(!entity) return res.status(404).send({
            message:"Entity not found"
        })
        const { trash } = req.query
        if (trash === 'true') {
            await sql `UPDATE entity SET trashed = true WHERE id=${entity.id}`
            return res.status(200).send()
        }
        await sql.begin(sql => [
            sql` delete from entry where entity=${entity.id} `,
            sql` delete from entity where id=${entity.id}`
        ])
        return res.status(200).send()
    } catch (err) {
        console.log(`Error in delete entity ${err}`)
        return res.status(500).send({
            message:generic_server_error_message
        })
    }
}



