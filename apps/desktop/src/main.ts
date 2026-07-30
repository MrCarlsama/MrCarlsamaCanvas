import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@mrcarlsama/ui-newsprint/tokens.css";
import "@mrcarlsama/studio/studio.css";
import "@mrcarlsama/editor-x6/editor.css";
import "./desktop.css";

createApp(App).use(createPinia()).mount("#app");
