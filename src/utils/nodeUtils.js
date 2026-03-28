/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Lavalink Node Utilities
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Waits for at least one Lavalink node to be CONNECTED
 * @param {Object} manager - Kazagumo manager
 * @param {number} maxWaitTime - Max wait in ms (default: 5000)
 * @returns {Promise<boolean>}
 */
async function waitForNodeConnection(manager, maxWaitTime = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitTime) {
    const connected = [...manager.shoukaku.nodes.values()].filter(
      (n) => n.state === 2
    );
    if (connected.length > 0) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

/**
 * Checks if any nodes are available (connecting or connected)
 */
function hasAvailableNodes(manager) {
  return [...manager.shoukaku.nodes.values()].some(
    (n) => n.state === 1 || n.state === 2
  );
}

/**
 * Gets the first available node
 */
function getAvailableNode(manager) {
  return (
    [...manager.shoukaku.nodes.values()].find(
      (n) => n.state === 1 || n.state === 2
    ) || null
  );
}

module.exports = { waitForNodeConnection, hasAvailableNodes, getAvailableNode };