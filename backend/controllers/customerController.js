import Customer from '../models/Customer.js';

// Get all customers
export const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    next(error); // Pass to error handler
  }
};

// ===== NEW: Search customers =====
export const searchCustomers = async (req, res, next) => {
  try {
    const { q, email, phone } = req.query;
    let query = {};
    
    // If email is provided, search by exact email
    if (email) {
      query.email = email;
    } 
    // If phone is provided, search by exact phone
    else if (phone) {
      query.phone = phone;
    } 
    // If search query is provided, search in name, email, and phone
    else if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }
    
    console.log('🔍 Searching customers with query:', query);
    const customers = await Customer.find(query).limit(20).sort({ createdAt: -1 });
    
    res.json(customers);
  } catch (error) {
    console.error('❌ Search customers error:', error);
    next(error);
  }
};

// Get customer by ID
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    next(error);
  }
};

// Get customer by email
export const getCustomerByEmail = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ email: req.params.email });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    next(error);
  }
};

// Create customer - FIXED VERSION
export const createCustomer = async (req, res, next) => {
  try {
    // Create a clean copy of the request body
    const customerData = { ...req.body };
    
    // Remove any fields that might cause issues
    delete customerData.id;
    delete customerData._id;
    delete customerData.__v;
    
    // Handle empty email
    if (customerData.email === '') {
      delete customerData.email;
    }
    
    console.log('📥 Creating customer with data:', customerData);
    
    // Create and save the customer
    const customer = new Customer(customerData);
    await customer.save();
    
    console.log('✅ Customer created:', customer._id);
    res.status(201).json(customer);
  } catch (error) {
    console.error('❌ Create customer error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Email already exists',
        field: 'email'
      });
    }
    
    // Pass to error handler
    next(error);
  }
};

// Update customer
export const updateCustomer = async (req, res, next) => {
  try {
    const customerData = { ...req.body };
    delete customerData.id;
    delete customerData._id;
    delete customerData.__v;
    
    if (customerData.email === '') {
      delete customerData.email;
    }
    
    console.log('📥 Updating customer:', req.params.id);
    
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...customerData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('✅ Customer updated:', customer._id);
    res.json(customer);
  } catch (error) {
    console.error('❌ Update customer error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Email already exists',
        field: 'email'
      });
    }
    
    next(error);
  }
};

// Update customer loyalty points
export const updateLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, amount } = req.body;
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    customer.loyaltyPoints += points;
    customer.totalSpent += amount;
    customer.lastVisit = new Date();
    await customer.save();
    
    res.json(customer);
  } catch (error) {
    next(error);
  }
};

// Delete customer
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};