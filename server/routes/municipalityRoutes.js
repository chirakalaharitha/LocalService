const express = require('express');
const router = express.Router();
const municipalityController = require('../controllers/municipalityController');

// Location resolution endpoints (support both POST and GET)
router.post('/resolve-location', municipalityController.resolveLocation);
router.get('/resolve-location', municipalityController.resolveLocation);

// Proximity and query endpoints
router.get('/nearby', municipalityController.getNearby);
router.get('/lookup-pincode/:pincode', municipalityController.lookupPincode);
router.get('/by-pincode/:pincode', municipalityController.getByPincode);
router.get('/by-city/:city', municipalityController.getByCity);

// Standard list and detail endpoints
router.get('/', municipalityController.getAllMunicipalities);
router.get('/:id', municipalityController.getMunicipalityById);

module.exports = router;
