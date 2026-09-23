const fs = require('fs');
let code = fs.readFileSync('src/pages/DeliveryManagement.jsx', 'utf8');

const insertionPoint = `  // Mark Delivery Status with Instant Optimistic UI Updating`;
const newFunction = `
  const handleMoveSequence = async (partnerStops, stopIndex, direction) => {
    if (direction === 'UP' && stopIndex === 0) return;
    if (direction === 'DOWN' && stopIndex === partnerStops.length - 1) return;

    const newStops = [...partnerStops];
    const swapIndex = direction === 'UP' ? stopIndex - 1 : stopIndex + 1;
    
    // Swap
    const temp = newStops[stopIndex];
    newStops[stopIndex] = newStops[swapIndex];
    newStops[swapIndex] = temp;

    // Build sequence array
    const sequences = newStops.map((st, idx) => ({ id: st.id, delivery_sequence: idx + 1 }));

    // Optimistically update demands state
    setDemands(prev => {
      const updated = [...prev];
      sequences.forEach(seq => {
        const dIdx = updated.findIndex(d => d.id === seq.id);
        if (dIdx > -1) {
          updated[dIdx] = { ...updated[dIdx], delivery_sequence: seq.delivery_sequence };
        }
      });
      return updated.sort((a, b) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0));
    });

    try {
      await fetch('/api/delivery/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ sequences })
      });
      fetchDeliveryData();
    } catch (err) {
      alert('Failed to reorder: ' + err.message);
      fetchDeliveryData();
    }
  };

  // Mark Delivery Status with Instant Optimistic UI Updating`;

code = code.replace(insertionPoint, newFunction);

// Now the UI for Up/Down arrows
// <div className="flex items-center gap-2.5 min-w-0">
// We want to add ArrowUp / ArrowDown icons.
// Also import ArrowUp, ArrowDown from lucide-react if not imported

if (!code.includes('ArrowUp')) {
  code = code.replace('Truck, User, ', 'Truck, User, ArrowUp, ArrowDown, ');
}

const uiTarget = `<div className="flex items-center gap-2.5 min-w-0">
                                  <span className={\`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 \${
                                    isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }\`}>
                                    {sIdx + 1}
                                  </span>`;

const newUi = `<div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex flex-col gap-0.5 mr-1">
                                    <button 
                                      onClick={() => handleMoveSequence(partner.stops, sIdx, 'UP')}
                                      disabled={sIdx === 0 || isDone}
                                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                      title="Move Stop Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveSequence(partner.stops, sIdx, 'DOWN')}
                                      disabled={sIdx === partner.stops.length - 1 || isDone}
                                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                                      title="Move Stop Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <span className={\`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 \${
                                    isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }\`}>
                                    {sIdx + 1}
                                  </span>`;

code = code.replace(uiTarget, newUi);

fs.writeFileSync('src/pages/DeliveryManagement.jsx', code);
console.log('DeliveryManagement updated');
