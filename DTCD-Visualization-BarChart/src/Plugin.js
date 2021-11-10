import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StyleSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor (guid, selector) {
    super();

    const logSystem = new LogSystemAdapter(guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter();
    const styleSystem = new StyleSystemAdapter();

    // console.log(styleSystem.getCurrentTheme());
    // styleSystem.setVariablesToElement(
    //   document.querySelector(selector),
    //   styleSystem.getCurrentTheme(),
    // );

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
  }

  setPluginConfig(config = {}) {}

  getPluginConfig() {}

  setFormSettings() {}

  getFormSettings() {}

}
