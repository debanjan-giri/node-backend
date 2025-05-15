import { Router } from "express";

const outletDiscoveryRoute = Router();

// discounts
outletDiscoveryRoute.get("/discovery-list");

// table booking
// outletDiscoveryRoute.get("/table-booking/:id");

export default outletDiscoveryRoute;
