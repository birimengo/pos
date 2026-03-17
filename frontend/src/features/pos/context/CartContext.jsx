// src/features/pos/context/CartContext.jsx
import { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

const initialState = {
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  customer: null,
  notes: ''
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal - state.discount;
        
        return {
          ...state,
          items: updatedItems,
          subtotal,
          total
        };
      } else {
        const newItem = { ...action.payload, quantity: 1 };
        const updatedItems = [...state.items, newItem];
        const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal - state.discount;
        
        return {
          ...state,
          items: updatedItems,
          subtotal,
          total
        };
      }
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal - state.discount;
      
      return {
        ...state,
        items: updatedItems,
        subtotal,
        total
      };
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal - state.discount;
      
      return {
        ...state,
        items: updatedItems,
        subtotal,
        total
      };
    }

    case 'SET_CUSTOMER':
      return { ...state, customer: action.payload };

    case 'SET_DISCOUNT': {
      const discount = action.payload;
      const total = state.subtotal - discount;
      return { ...state, discount, total };
    }

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'CLEAR_CART':
      return initialState;

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};