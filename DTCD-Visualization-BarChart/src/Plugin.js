import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  DataSourceSystemAdapter,
  StorageSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {
  #title;
  #targetName;
  #dataSource;
  #storageSystem;

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    const logSystem = new LogSystemAdapter(guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter(guid);
    const dataSourceSystem = new DataSourceSystemAdapter();

    eventSystem.registerPluginInstance(this);
    this.#storageSystem = new StorageSystemAdapter();

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem, dataSourceSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
    this.#title = '';
    this.#targetName = '';
    this.#dataSource = '';
  }

  loadData(data) {
    this.vueComponent.dataset = data;
    this.vueComponent.render();
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    this.#dataSource = dataSource;
    const data = this.#storageSystem.session.getRecord(this.#dataSource);
    this.loadData(data);
  }

  setPluginConfig(config = {}) {
    const { title, targetName, dataSource } = config;

    if (typeof title !== 'undefined') {
      this.#title = title;
      this.vueComponent.setTitle(title);
    }

    if (typeof targetName !== 'undefined') {
      this.#targetName = targetName;
      this.vueComponent.setTargetName(targetName);
    }

    if (typeof dataSource !== 'undefined') {
      this.#dataSource = dataSource;
      const DS = this.getSystem('DataSourceSystem').getDataSource(this.#dataSource);
      if (DS.status === 'success') {
        const data = this.#storageSystem.session.getRecord(this.#dataSource);
        this.loadData(data);
      }
    }
  }

  getPluginConfig() {
    const config = {};
    if (this.#title) config.title = this.#title;
    if (this.#dataSource) config.dataSource = this.#dataSource;
    if (this.#targetName) config.targetName = this.#targetName;
    return config;
  }

  setFormSettings() {}

  getFormSettings() {}
}
