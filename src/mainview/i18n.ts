import i18next from 'i18next';
import { initLitI18n } from 'lit-i18n';

const resources = {
  en: {
    translation: {
      "app": {
        "title": "Plugin Manager",
        "toggleTheme": "Toggle theme",
        "manualManagement": "Manual Plugin Management",
        "dragDropNotice": "Drag and Drop your plugin folders into the plugins directory. The system will automatically detect and load them.",
        "openFolder": "Open Plugins Folder",
        "openRules": "Open Rules Folder",
        "loading": "Loading plugins...",
        "noPlugins": "No plugins installed yet.",
        "clickToAdd": "Click the button above to open the directory and add your plugins manually.",
        "uninstall": "Uninstall",
        "openPluginFolder": "Open Plugin Folder",
        "enable": "Enable",
        "disable": "Disable",
        "noDescription": "No description provided.",
        "settings": "Settings",
        "language": "Language",
        "theme": "Theme",
        "themeLight": "Light",
        "themeDark": "Dark",
        "close": "Close"
      },
      "messages": {
        "loadFailed": "Failed to load plugins: {{error}}",
        "removeConfirm": "Are you sure you want to remove \"{{name}}\"? This will delete the plugin folder permanently.",
        "removeSuccess": "Successfully removed {{name}}",
        "removeFailed": "Removal failed: {{error}}"
      }
    }
  },
  es: {
    translation: {
      "app": {
        "title": "Gestor de Plugins",
        "toggleTheme": "Cambiar tema",
        "manualManagement": "Gestión Manual de Plugins",
        "dragDropNotice": "Arrastra y suelta tus carpetas de plugins en el directorio de plugins. El sistema los detectará y cargará automáticamente.",
        "openFolder": "Abrir Carpeta de Plugins",
        "openRules": "Abrir Carpeta de Reglas",
        "loading": "Cargando plugins...",
        "noPlugins": "No hay plugins instalados todavía.",
        "clickToAdd": "Haz clic en el botón de arriba para abrir el directorio y añadir tus plugins manualmente.",
        "uninstall": "Desinstalar",
        "openPluginFolder": "Abrir Carpeta de Plugin",
        "enable": "Activar",
        "disable": "Desactivar",
        "noDescription": "Sin descripción.",
        "settings": "Ajustes",
        "language": "Idioma",
        "theme": "Tema",
        "themeLight": "Claro",
        "themeDark": "Oscuro",
        "close": "Cerrar"
      },
      "messages": {
        "loadFailed": "Error al cargar los plugins: {{error}}",
        "removeConfirm": "¿Estás seguro de que quieres eliminar \"{{name}}\"? Esto borrará la carpeta del plugin permanentemente.",
        "removeSuccess": "Se ha eliminado correctamente {{name}}",
        "removeFailed": "Error al eliminar: {{error}}"
      }
    }
  }
};

// Simple language detection
const systemLang = navigator.language.split('-')[0];
const defaultLang = resources.hasOwnProperty(systemLang) ? systemLang : 'en';

export const i18nPromise = i18next.use(initLitI18n).init({
  lng: defaultLang,
  fallbackLng: 'en',
  resources,
  interpolation: {
    escapeValue: false // lit-html handles escaping
  }
});

export { i18next };
