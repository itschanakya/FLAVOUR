const clients = new Map();

function addClient(userId, role, res) {
  const id = Number(userId);
  if (!clients.has(id)) {
    clients.set(id, []);
  }
  
  const clientData = { res, role: String(role || '').toUpperCase() };
  clients.get(id).push(clientData);

  const reqToCleanup = () => {
    const userClients = clients.get(id);
    if (userClients) {
      const idx = userClients.indexOf(clientData);
      if (idx !== -1) userClients.splice(idx, 1);
      if (userClients.length === 0) clients.delete(id);
    }
  };
  return reqToCleanup;
}

function broadcastToUser(userId, eventType, data) {
  const id = Number(userId);
  const userClients = clients.get(id);
  if (userClients) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    userClients.forEach(c => {
      try {
        if (!c.res.destroyed && !c.res.writableEnded) {
          c.res.write(payload);
        }
      } catch (err) {
        console.error('SSE user write error:', err);
      }
    });
  }
}

function broadcastToRole(role, eventType, data) {
  const targetRole = String(role || '').toUpperCase();
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((userClients) => {
    userClients.forEach(c => {
      try {
        if (c.role === targetRole && !c.res.destroyed && !c.res.writableEnded) {
          c.res.write(payload);
        }
      } catch (err) {
        console.error('SSE role write error:', err);
      }
    });
  });
}

function broadcastToAll(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((userClients) => {
    userClients.forEach(c => {
      try {
        if (!c.res.destroyed && !c.res.writableEnded) {
          c.res.write(payload);
        }
      } catch (err) {
        console.error('SSE all write error:', err);
      }
    });
  });
}

module.exports = {
  addClient,
  broadcastToUser,
  broadcastToRole,
  broadcastToAll
};
