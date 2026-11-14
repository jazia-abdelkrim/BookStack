import { createContext, useContext, useMemo, useReducer, useState } from 'react';
const CartContext = createContext(null);
function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const current = state[action.book.id];
      return { ...state, [action.book.id]: { book: action.book, qty: Math.min((current?.qty || 0) + 1, 20) } };
    }
    case 'dec': {
      const current = state[action.id]; if (!current) return state;
      const next = { ...state };
      if (current.qty <= 1) delete next[action.id]; else next[action.id] = { ...current, qty: current.qty - 1 };
      return next;
    }
    case 'remove': { const next = { ...state }; delete next[action.id]; return next; }
    case 'clear': return {};
    default: return state;
  }
}
export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, {});
  const [open, setOpen] = useState(false);
  const value = useMemo(() => {
    const lines = Object.values(items);
    return {
      lines, count: lines.reduce((sum, line) => sum + line.qty, 0),
      total: lines.reduce((sum, line) => sum + Number(line.book.price || 0) * line.qty, 0),
      open, setOpen, add: (book) => { dispatch({ type: 'add', book }); setOpen(true); },
      dec: (id) => dispatch({ type: 'dec', id }), inc: (book) => dispatch({ type: 'add', book }),
      remove: (id) => dispatch({ type: 'remove', id }), clear: () => dispatch({ type: 'clear' }),
    };
  }, [items, open]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
