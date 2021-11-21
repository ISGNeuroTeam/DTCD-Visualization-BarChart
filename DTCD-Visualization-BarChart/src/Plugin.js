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
  static getRegistrationMeta() {
    return pluginMeta;
  }

  #guid;
  #dataSourceSystemGUID;
  #dataSource;
  #logSystem;
  #dataSourceSystem;
  #eventSystem;
  #storageSystem;
  #targetName;

  constructor(guid, selector) {
    super();

    this.#guid = guid;
    this.#dataSourceSystemGUID = this.getGUID(this.getSystem('DataSourceSystem'));
    const logSystem = (this.#logSystem = new LogSystemAdapter(guid, pluginMeta.name));
    const eventSystem = (this.#eventSystem = new EventSystemAdapter(guid));
    eventSystem.registerPluginInstance(this);
    const dataSourceSystem = (this.#dataSourceSystem = new DataSourceSystemAdapter());
    this.#storageSystem = new StorageSystemAdapter();

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem, dataSourceSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
    this.#dataSource = '';
    this.#targetName = '';
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
    const targetName = config?.targetName;
    const dataSource = config?.dataSource;
    if (targetName && dataSource) {
      this.#dataSource = dataSource;
      this.#targetName = targetName;
      this.vueComponent.targetName = targetName;
      const DS = this.getSystem('DataSourceSystem').getDataSource(this.#dataSource);
      if (DS.status === 'success') {
        const data = this.#storageSystem.session.getRecord(this.#dataSource);
        this.loadData(data);
      }
    }
  }

  getPluginConfig() {
    const config = {};
    if (this.#dataSource) config.dataSource = this.#dataSource;
    if (this.#targetName) config.targetName = this.#targetName;
    return config;
  }

  setFormSettings() {}

  getFormSettings() {}
}
