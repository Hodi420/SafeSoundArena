/**
 * MCP Permissions Manager - Advanced
 * Features:
 * - טעינה/שמירה אוטומטית ל-JSON
 * - בדיקת הרשאות מרובות
 * - הרשאות ברירת מחדל דינמיות
 * - לוגים
 * - ייבוא משתמשים חיצוניים
 * - תיעוד API
 * - תואם דוקר
 */
// Import users/roles from external source (e.g., LDAP, API, CSV)
function importExternalUsers(usersArr) {
  usersArr.forEach(({ userId, roles }) => {
    if (!permissions[userId]) permissions[userId] = [];
    roles.forEach(role => {
      if (!permissions[userId].includes(role)) permissions[userId].push(role);
    });
  });
  savePermissions();
}

// Example: importExternalUsers([{userId: 'ldapUser', roles: ['read','write']}]);
/**
 * Example usage:
 *
 * const mcp = require('./mcp-permissions');
 * mcp.addPermission('idan', 'admin');
 * mcp.hasPermission('idan', 'admin'); // true
 * mcp.hasAnyPermission('idan', ['read','admin']);
 * mcp.importExternalUsers([{userId:'ldapUser',roles:['read']}]);
 */
// MCP Permissions Manager - Advanced
// In-memory & file-based role-based access control for MCP actions

const fs = require('fs');
const path = require('path');
const PERMISSIONS_FILE = path.join(__dirname, 'mcp-permissions.json');

let permissions = {};
let defaultRoles = ['read'];

// Load permissions from file if exists
function loadPermissions() {
  if (fs.existsSync(PERMISSIONS_FILE)) {
    try {
      permissions = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf8'));
      console.log('[MCP] Permissions loaded from file.');
    } catch (e) {
      console.error('[MCP] Failed to load permissions:', e);
    }
  }
}

// Save permissions to file
function savePermissions() {
  try {
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(permissions, null, 2));
    console.log('[MCP] Permissions saved to file.');
  } catch (e) {
    console.error('[MCP] Failed to save permissions:', e);
  }
}

function addPermission(userId, role) {
  if (!permissions[userId]) permissions[userId] = [];
  if (!permissions[userId].includes(role)) {
    permissions[userId].push(role);
    savePermissions();
    logAction('addPermission', userId, role);
  }
}

function removePermission(userId, role) {
  if (!permissions[userId]) return;
  permissions[userId] = permissions[userId].filter(r => r !== role);
  savePermissions();
  logAction('removePermission', userId, role);
}

function hasPermission(userId, role) {
  return (permissions[userId] && permissions[userId].includes(role)) || defaultRoles.includes(role);
}

// Check if user has any of the roles in array
function hasAnyPermission(userId, rolesArr) {
  const userRoles = getUserRoles(userId);
  return rolesArr.some(r => userRoles.includes(r));
}

// Check if user has all roles in array
function hasAllPermissions(userId, rolesArr) {
  const userRoles = getUserRoles(userId);
  return rolesArr.every(r => userRoles.includes(r));
}

function getUserRoles(userId) {
  return permissions[userId] || [...defaultRoles];
}

function setDefaultRoles(rolesArr) {
  defaultRoles = rolesArr;
}

function getAllUsers() {
  return Object.keys(permissions);
}

function logAction(action, userId, role) {
  console.log(`[MCP] ${action} - user: ${userId}, role: ${role}`);
}

// Init
loadPermissions();

module.exports = {
  addPermission,
  removePermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserRoles,
  setDefaultRoles,
  getAllUsers,
  permissions, // for debugging
  savePermissions,
  loadPermissions
};
