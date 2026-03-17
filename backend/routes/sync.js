// routes/sync.js
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const auth = require('../middleware/auth');

router.post('/products', auth, syncController.syncProducts);
router.post('/transactions', auth, syncController.syncTransactions);
router.get('/data', auth, syncController.getSyncData);

module.exports = router;