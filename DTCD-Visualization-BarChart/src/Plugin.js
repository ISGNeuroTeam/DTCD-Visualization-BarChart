import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  DataSourceSystemAdapter,
  StorageSystemAdapter,
} from './../../DTCD-SDK';

export class VisualizationBarChart extends PanelPlugin {

  #id;
  #guid;
  #selector;
  #logSystem;
  #eventSystem;
  #storageSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;
  #vue;
  #lastVisible;

  #config = {
    ...this.defaultConfig,
    targetName: '',
    xAxis: 'name',
    colValue: 'value',
    colLineValue: '',
    leftAxisWidth: 0,
    dataSource: '',
    showAxisX: true,
    showAxisY: false,
    horizontalMode: false,
    roundValueTo: '2',
    colorsByRange: [],
  };

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    this.#id = `${pluginMeta.name}[${guid}]`;
    this.#guid = guid;
    this.#selector = selector;
    this.#logSystem = new LogSystemAdapter('0.5.0', guid, pluginMeta.name);
    this.#eventSystem = new EventSystemAdapter('0.4.0', guid);
    this.#eventSystem.registerPluginInstance(this, ['Clicked']);
    this.#storageSystem = new StorageSystemAdapter('0.5.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.2.0');

    this.#dataSourceSystemGUID = this.getGUID(
      this.getSystem('DataSourceSystem', '0.2.0')
    );

    const { default: VueJS } = this.getDependence('Vue');

    this.#vue = new VueJS({
      data: () => ({
        visible: true,
        dataset: [],
        config: { ...this.#config },
      }),
      render(h) {
        return this.visible ? h(PluginComponent) : null;
      },
      methods: {
        publishEventClicked: (value) => {
          this.#eventSystem.publishEvent('Clicked', value);
        },
      }
    }).$mount(this.#selector);

    this.setResizeObserver(this.#vue.$el, (size) => {
      this.#vue.$emit('resize', size)
    });

    this.#logSystem.debug(`${this.#id} initialization complete`);
  }

  beforeUninstall() {
    this.resizeObserver.unobserve(this.#vue.$el);
    this.#vue.$destroy();
  }

  setVisible(isVisible) {
    if (this.#lastVisible !== isVisible) {
      this.#vue.visible = isVisible;
      this.#lastVisible = isVisible;
    }
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    if (dataSource === this.#config.dataSource) {
      this.#logSystem.debug(
        `${this.#id} process DataSourceStatusUpdate({ dataSource: ${dataSource}, status: ${status} })`
      );
      this.#vue.dataset = this.#storageSystem.session.getRecord(dataSource);
    }
  }

  setPluginConfig(config = {}) {
    this.#logSystem.debug(`Set new config to ${this.#id}`);
    const configProps = Object.keys(this.#config);

    for (const [prop, value] of Object.entries(config)) {
      if (!configProps.includes(prop)) continue;
      this.#config[prop] = value;
      this.#vue.config[prop] = value;
      this.#logSystem.debug(`${this.#id} config prop value "${prop}" set to "${value}"`);
    }

    if (Object.keys(config).includes('dataSource')) {
      const prop = 'dataSource';
      const dsNewName = config.dataSource;
      if (this.#config[prop]) {
        this.#logSystem.debug(
          `Unsubscribing ${this.#id} from DataSourceStatusUpdate({ dataSource: ${this.#config[prop]}, status: success })`
        );
        this.#eventSystem.unsubscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: this.#config[prop], status: 'success' },
        );
      }
      this.#config[prop] = dsNewName;

      this.#logSystem.debug(
        `Subscribing ${this.#id} for DataSourceStatusUpdate({ dataSource: ${dsNewName}, status: success })`
      );

      this.#eventSystem.subscribe(
        this.#dataSourceSystemGUID,
        'DataSourceStatusUpdate',
        this.#guid,
        'processDataSourceEvent',
        { dataSource: dsNewName, status: 'success' },
      );

      const ds = this.#dataSourceSystem.getDataSource(dsNewName);

      if (ds && ds.status === 'success') {
        this.#vue.dataset = this.#storageSystem.session.getRecord(dsNewName);
      }
    }
  }

  getDataFields() {
    const {
      dataSource,
    } = this.#config;
    const data = this.#storageSystem.session.getRecord(dataSource);
    return data ? Object.keys(data[0]) : [];
  }

  getSelectFieldsField(propName, label) {
    const fields = this.getDataFields();
    const curValue = this.#config[propName] || null;
    const emptyItem = { label: '--Нет--', value: '' };
    const options = [
      emptyItem,
      ...fields.map((name) => ({
        label: name,
        value: name,
      })),
    ];

    if (typeof curValue === 'string' && !fields.includes(curValue)) {
      options.push({
        label: `Сохраненное: ${curValue}`,
        value: curValue,
      });
    }

    return {
      component: fields.length ? 'select' : 'text',
      options,
      propName,
      attrs: {
        label,
      },
    }
  }

  getPluginConfig() {
    return { ...this.#config };
  }

  setFormSettings(config) {
    const cleanConfig = {};
    Object.keys(config).forEach((name) => {
      if (config[name] === '--Нет--') {
        cleanConfig[name] = '';
        return;
      }
      cleanConfig[name] = config[name];
    })
    this.setPluginConfig(cleanConfig);
  }

  getFormSettings() {
    return {
      fields: [
        {
          component: 'title',
          propValue: 'Общие настройки',
        },
        {
          component: 'title',
          propValue: 'Источник данных',
        },
        {
          component: 'datasource',
          propName: 'dataSource',
          attrs: {
            label: 'Выберите источник данных',
            placeholder: 'Выберите значение',
            required: true,
          },
        },
        ...this.defaultFields,

        this.getSelectFieldsField('xAxis', 'Имя колонки с названием столбцов'),
        this.getSelectFieldsField('colValue', 'Имя колонки со значением'),
        this.getSelectFieldsField('colLineValue', 'Имя колонки для линии на столбцах'),

        {
          component: 'text',
          propName: 'targetName',
          attrs: {
            label: 'Название целевого указателя',
            propValue: 'targetName',
          },
        },
        {
          component: 'switch',
          propName: 'showAxisX',
          attrs: {
            label: 'Включить шкалу X',
          },
        },
        {
          component: 'switch',
          propName: 'showAxisY',
          attrs: {
            label: 'Включить шкалу Y',
          },
        },
        {
          component: 'switch',
          propName: 'horizontalMode',
          attrs: {
            label: 'Горизонтальный вид графика',
          },
        },
        {
          component: 'select',
          propName: 'roundValueTo',
          attrs: {
            label: 'Округлять значения на графике',
          },
          options: [
            { label: '0', value: '0' },
            { label: '0.0', value: '1' },
            { label: '0.00', value: '2' },
            { label: '0.000', value: '3' },
            { label: '0.0000', value: '4' },
            { label: '0.00000', value: '5' },
            { label: '0.000000', value: '6' },
          ],
        },
        {
          component: 'title',
          propValue: 'Настройка цветов',
        },
        {
          component: 'gauge-segments',
          propName: 'colorsByRange',
        },
      ],
    };
  }
  
  getState() {
    return this.getPluginConfig();
  }

  setState(newState) {
    if (typeof newState !== 'object' ) return;

    this.setPluginConfig(newState);
  }
}
