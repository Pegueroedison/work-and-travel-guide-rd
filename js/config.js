/* === WORK AND TRAVEL GUIDE RD — CONFIGURACIÓN ===
   URLs conectadas a las Web Apps de Google Apps Script.
   No necesitas editar GitHub para activar/desactivar Instagram, anuncios, grupos o curso:
   eso se controla desde Google Sheets y desde el Panel Admin.
*/
window.WT_CONFIG = {
  CONTENT_API_URL: 'https://script.google.com/macros/s/AKfycbyG31iS6HEjKcw0ZKhUG-yhXcuo6sx3FYkoNyAu_1m8kZdRdObVL9kWRMATnN-3oB9QuQ/exec', // Web App de Contenido y Publicidad
  USERS_API_URL: 'https://script.google.com/macros/s/AKfycbx6C_64qD4nX9q2R_z1RkxYT3A5GiwOk2rV4dAuZgZAVhec61qHO6EILCwONCiXKg4Izg/exec',   // Web App de Usuarios
  FORUM_API_URL: 'https://script.google.com/macros/s/AKfycbzVF_BJH5lXSHi1Qi89d24r_zP0sZsU2_YL6XDC8DBLhC6MWIq4NMxGRoQUoyVRqAue/exec',   // Web App del Foro
  APP_NAME: 'Work and Travel Guide RD',
  DEFAULT_INSTAGRAM_URL: 'https://www.instagram.com/',
  MAX_PROFILE_PHOTO_MB: 2
};


/* === Data provider opcional ===
   sheets = usa Web Apps actuales.
   supabase = usa Supabase cuando WT_SUPABASE_CONFIG.USE_SUPABASE sea true.
*/
window.WT_DATA_PROVIDER = "sheets";
