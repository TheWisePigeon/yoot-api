import { Router } from "express"
import { authenticate_request } from "../../middlewares/Auth"
import { get_entities, delete_entity } from "../../services/Entities"

const entities_router = Router()

entities_router.route("/entities").get( authenticate_request, get_entities )
entities_router.route("/entities/:name").delete( authenticate_request, delete_entity )

export default entities_router