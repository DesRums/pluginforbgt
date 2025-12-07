(function() {
  'use strict';

  // ==================== КОНФІГУРАЦІЯ ====================
  const CONFIG = {
    api: 'lampac',
    localhost: 'https://rc.bwa.to/',
    apn: '',
    timeouts: {
      default: 10000,
      request: 8000,
      lifeSource: 3000,
      createSource: 15000
    },
    limits: {
      maxRequests: 10,
      requestInterval: 4000,
      maxLifeWait: 15
    }
  };

  // ==================== УТИЛІТИ ====================
  const Utils = {
    getUnicId() {
      let id = Lampa.Storage.get('lampac_unic_id', '');
      if (!id) {
        id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('lampac_unic_id', id);
      }
      return id;
    },

    getAndroidVersion() {
      if (!Lampa.Platform.is('android')) return 0;
      try {
        const current = AndroidJS.appVersion().split('-');
        return parseInt(current.pop()) || 0;
      } catch (e) {
        return 0;
      }
    },

    debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },

    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  };

  // ==================== КЕШУВАННЯ ====================
  const Cache = {
    balansers: undefined,
    templates: new Map(),
    
    get(key) {
      return this[key];
    },
    
    set(key, value) {
      this[key] = value;
      return value;
    }
  };

  // ==================== ІНІЦІАЛІЗАЦІЯ ====================
  const unic_id = Utils.getUnicId();
  const hostkey = CONFIG.localhost.replace(/^https?:\/\//, '');

  // Ініціалізація RCH
  if (!window.rch_nws) window.rch_nws = {};
  
  if (!window.rch_nws[hostkey]) {
    window.rch_nws[hostkey] = {
      type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
      startTypeInvoke: false,
      rchRegistry: false,
      apkVersion: Utils.getAndroidVersion()
    };
  }

  // ==================== RCH ФУНКЦІЇ ====================
  window.rch_nws[hostkey].typeInvoke = function(host, callback) {
    if (!window.rch_nws[hostkey].startTypeInvoke) {
      window.rch_nws[hostkey].startTypeInvoke = true;

      const check = (good) => {
        window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
        callback();
      };

      if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) {
        check(true);
      } else {
        const net = new Lampa.Reguest();
        const checkUrl = CONFIG.localhost.indexOf(location.host) >= 0 
          ? 'https://github.com/' 
          : `${host}/cors/check`;
        
        net.silent(checkUrl, 
          () => check(true), 
          () => check(false), 
          false, 
          { dataType: 'text' }
        );
      }
    } else {
      callback();
    }
  };

  window.rch_nws[hostkey].Registry = function(client, startConnection) {
    window.rch_nws[hostkey].typeInvoke(CONFIG.localhost, () => {
      client.invoke("RchRegistry", JSON.stringify({
        version: 149,
        host: location.host,
        rchtype: Lampa.Platform.is('android') ? 'apk' : 
                 Lampa.Platform.is('tizen') ? 'cors' : 
                 window.rch_nws[hostkey].type,
        apkVersion: window.rch_nws[hostkey].apkVersion,
        player: Lampa.Storage.field('player'),
        account_email: Lampa.Storage.get('account_email'),
        unic_id: Lampa.Storage.get('lampac_unic_id', ''),
        profile_id: Lampa.Storage.get('lampac_profile_id', ''),
        token: ''
      }));

      if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
        if (startConnection) startConnection();
        return;
      }

      window.rch_nws[hostkey].rchRegistry = true;

      client.on('RchRegistry', (clientIp) => {
        if (startConnection) startConnection();
      });

      client.on("RchClient", (rchId, url, data, headers, returnHeaders) => {
        const network = new Lampa.Reguest();

        const result = (html) => {
          if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
            html = JSON.stringify(html);
          }

          if (typeof CompressionStream !== 'undefined' && html?.length > 1000) {
            compressAndSend(html, rchId, client);
          } else {
            client.invoke("RchResult", rchId, html);
          }
        };

        if (url === 'eval') {
          console.log('RCH eval:', data);
          result(eval(data));
        } else if (url === 'evalrun') {
          console.log('RCH evalrun:', data);
          eval(data);
        } else if (url === 'ping') {
          result('pong');
        } else {
          console.log('RCH request:', url);
          network.native(url, result, () => {
            console.log('RCH: result empty');
            result('');
          }, data, {
            dataType: 'text',
            timeout: CONFIG.timeouts.request,
            headers,
            returnHeaders
          });
        }
      });

      client.on('Connected', (connectionId) => {
        console.log('RCH Connected:', connectionId);
        window.rch_nws[hostkey].connectionId = connectionId;
      });

      client.on('Closed', () => console.log('RCH: Connection closed'));
      client.on('Error', (err) => console.log('RCH error:', err));
    });
  };

  // Допоміжна функція для стиснення
  function compressAndSend(html, rchId, client) {
    const compressionStream = new CompressionStream('gzip');
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(html));
        controller.close();
      }
    });

    readable.pipeThrough(compressionStream)
      .then(stream => new Response(stream).arrayBuffer())
      .then(compressedBuffer => {
        const compressedArray = new Uint8Array(compressedBuffer);
        if (compressedArray.length > html.length) {
          client.invoke("RchResult", rchId, html);
        } else {
          $.ajax({
            url: `${CONFIG.localhost}rch/gzresult?id=${rchId}`,
            type: 'POST',
            data: compressedArray,
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            success: () => {},
            error: () => client.invoke("RchResult", rchId, html)
          });
        }
      })
      .catch(() => client.invoke("RchResult", rchId, html));
  }

  window.rch_nws[hostkey].typeInvoke(CONFIG.localhost, () => {});

  // ==================== RCH INVOKE ====================
  function rchInvoke(json, callback) {
    if (window.nwsClient?.[hostkey]?._shouldReconnect) {
      callback();
      return;
    }

    if (!window.nwsClient) window.nwsClient = {};
    
    if (window.nwsClient[hostkey]?.socket) {
      window.nwsClient[hostkey].socket.close();
    }

    window.nwsClient[hostkey] = new NativeWsClient(json.nws, { autoReconnect: false });
    window.nwsClient[hostkey].on('Connected', () => {
      window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], callback);
    });
    window.nwsClient[hostkey].connect();
  }

  function rchRun(json, callback) {
    if (typeof NativeWsClient === 'undefined') {
      Lampa.Utils.putScript(
        [`${CONFIG.localhost}js/nws-client-es5.js?v18112025`],
        () => {},
        false,
        () => rchInvoke(json, callback),
        true
      );
    } else {
      rchInvoke(json, callback);
    }
  }

  // ==================== ACCOUNT ====================
  function account(url) {
    url = String(url);
    const params = [];

    if (!url.includes('account_email=')) {
      const email = Lampa.Storage.get('account_email');
      if (email) params.push(`account_email=${encodeURIComponent(email)}`);
    }

    if (!url.includes('uid=')) {
      const uid = Lampa.Storage.get('lampac_unic_id', '');
      if (uid) params.push(`uid=${encodeURIComponent(uid)}`);
    }

    if (!url.includes('token=')) {
      const token = '';
      if (token) params.push('token=');
    }

    if (!url.includes('nws_id=') && window.rch_nws?.[hostkey]?.connectionId) {
      params.push(`nws_id=${encodeURIComponent(window.rch_nws[hostkey].connectionId)}`);
    }

    if (params.length) {
      return params.reduce((acc, param) => Lampa.Utils.addUrlComponent(acc, param), url);
    }

    return url;
  }

  // ==================== КОМПОНЕНТ ====================
  function component(object) {
    const network = new Lampa.Reguest();
    const scroll = new Lampa.Scroll({ mask: true, over: true });
    const files = new Lampa.Explorer(object);
    const filter = new Lampa.Filter(object);

    // Стан компонента
    const state = {
      sources: {},
      last: null,
      source: null,
      balanser: null,
      initialized: false,
      images: [],
      number_of_requests: 0,
      life_wait_times: 0,
      filter_sources: [],
      filter_find: { season: [], voice: [] }
    };

    // Таймери
    const timers = {
      balanser: null,
      requests: null,
      lifeWait: null,
      
      clear() {
        clearInterval(this.balanser);
        clearTimeout(this.requests);
        clearTimeout(this.lifeWait);
      }
    };

    const filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };

    // Завантаження балансерів
    if (Cache.balansers === undefined) {
      network.timeout(CONFIG.timeouts.default);
      network.silent(
        account(`${CONFIG.localhost}lite/withsearch`),
        (json) => Cache.set('balansers', json),
        () => Cache.set('balansers', [])
      );
    }

    // ==================== ДОПОМІЖНІ ФУНКЦІЇ ====================
    const helpers = {
      balanserName(j) {
        return (j.balanser || j.name.split(' ')[0]).toLowerCase();
      },

      clarificationSearch: {
        getId() {
          return Lampa.Utils.hash(
            object.movie.number_of_seasons 
              ? object.movie.original_name 
              : object.movie.original_title
          );
        },

        add(value) {
          const id = this.getId();
          const all = Lampa.Storage.get('clarification_search', '{}');
          all[id] = value;
          Lampa.Storage.set('clarification_search', all);
        },

        delete() {
          const id = this.getId();
          const all = Lampa.Storage.get('clarification_search', '{}');
          delete all[id];
          Lampa.Storage.set('clarification_search', all);
        },

        get() {
          const id = this.getId();
          const all = Lampa.Storage.get('clarification_search', '{}');
          return all[id];
        }
      }
    };

    // ==================== ІНІЦІАЛІЗАЦІЯ ====================
    this.initialize = function() {
      this.loading(true);

      filter.onSearch = (value) => {
        helpers.clarificationSearch.add(value);
        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true
        });
      };

      filter.onBack = () => this.start();

      filter.render().find('.selector').on('hover:enter', () => {
        clearInterval(timers.balanser);
      });

      filter.render().find('.filter--search')
        .appendTo(filter.render().find('.torrent-filter'));

      filter.onSelect = (type, a, b) => {
        if (type === 'filter') {
          if (a.reset) {
            helpers.clarificationSearch.delete();
            this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: '',
              voice_name: ''
            });
            setTimeout(() => {
              Lampa.Select.close();
              Lampa.Activity.replace({ clarification: 0, similar: 0 });
            }, 10);
          } else {
            const url = state.filter_find[a.stype][b.index].url;
            const choice = this.getChoice();
            
            if (a.stype === 'voice') {
              choice.voice_name = state.filter_find.voice[b.index].title;
              choice.voice_url = url;
            }
            
            choice[a.stype] = b.index;
            this.saveChoice(choice);
            this.reset();
            this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type === 'sort') {
          Lampa.Select.close();
          object.lampac_custom_select = a.source;
          this.changeBalanser(a.source);
        }
      };

      if (filter.addButtonBack) filter.addButtonBack();

      filter.render().find('.filter--sort span')
        .text(Lampa.Lang.translate('lampac_balanser'));

      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));

      Lampa.Controller.enable('content');
      this.loading(false);

      if (object.balanser) {
        files.render().find('.filter--search').remove();
        state.sources = {};
        state.sources[object.balanser] = { name: object.balanser };
        state.balanser = object.balanser;
        state.filter_sources = [];

        return network.native(
          account(object.url.replace('rjson=', 'nojson=')),
          this.parse.bind(this),
          () => {
            files.render().find('.torrent-filter').remove();
            this.empty();
          },
          false,
          { dataType: 'text' }
        );
      }

      this.externalids()
        .then(() => this.createSource())
        .then(() => {
          const balansers = Cache.get('balansers') || [];
          if (!balansers.find(b => state.balanser.slice(0, b.length) === b)) {
            filter.render().find('.filter--search').addClass('hide');
          }
          this.search();
        })
        .catch((e) => this.noConnectToServer(e));
    };

    this.rch = function(json, noreset) {
      rchRun(json, () => {
        if (!noreset) this.find();
        else noreset();
      });
    };

    this.externalids = function() {
      return new Promise((resolve, reject) => {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          const query = [
            `id=${encodeURIComponent(object.movie.id)}`,
            `serial=${object.movie.name ? 1 : 0}`
          ];

          if (object.movie.imdb_id) query.push(`imdb_id=${object.movie.imdb_id}`);
          if (object.movie.kinopoisk_id) query.push(`kinopoisk_id=${object.movie.kinopoisk_id}`);

          const url = `${CONFIG.localhost}externalids?${query.join('&')}`;
          network.timeout(CONFIG.timeouts.default);
          network.silent(
            account(url),
            (json) => {
              Object.assign(object.movie, json);
              resolve();
            },
            resolve
          );
        } else {
          resolve();
        }
      });
    };

    this.updateBalanser = function(balanser_name) {
      const last_select = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select[object.movie.id] = balanser_name;
      Lampa.Storage.set('online_last_balanser', last_select);
    };

    this.changeBalanser = function(balanser_name) {
      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      
      const to = this.getChoice(balanser_name);
      const from = this.getChoice();
      
      if (from.voice_name) to.voice_name = from.voice_name;
      
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };

    this.requestParams = function(url) {
      const query = [];
      const card_source = object.movie.source || 'tmdb';

      query.push(`id=${encodeURIComponent(object.movie.id)}`);
      
      if (object.movie.imdb_id) query.push(`imdb_id=${object.movie.imdb_id}`);
      if (object.movie.kinopoisk_id) query.push(`kinopoisk_id=${object.movie.kinopoisk_id}`);
      if (object.movie.tmdb_id) query.push(`tmdb_id=${object.movie.tmdb_id}`);

      const title = object.clarification ? object.search : (object.movie.title || object.movie.name);
      query.push(`title=${encodeURIComponent(title)}`);
      query.push(`original_title=${encodeURIComponent(object.movie.original_title || object.movie.original_name)}`);
      query.push(`serial=${object.movie.name ? 1 : 0}`);
      query.push(`original_language=${object.movie.original_language || ''}`);
      
      const year = ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4);
      query.push(`year=${year}`);
      query.push(`source=${card_source}`);
      query.push(`clarification=${object.clarification ? 1 : 0}`);
      query.push(`similar=${object.similar || false}`);
      query.push(`rchtype=${window.rch_nws?.[hostkey]?.type || ''}`);

      const email = Lampa.Storage.get('account_email', '');
      if (email) query.push(`cub_id=${Lampa.Utils.hash(email)}`);

      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };

    this.getLastChoiceBalanser = function() {
      const last_select = Lampa.Storage.cache('online_last_balanser', 3000, {});
      return last_select[object.movie.id] || 
             Lampa.Storage.get('online_balanser', state.filter_sources[0] || '');
    };

    this.startSource = function(json) {
      return new Promise((resolve, reject) => {
        json.forEach(j => {
          const name = helpers.balanserName(j);
          state.sources[name] = {
            url: j.url,
            name: j.name,
            show: typeof j.show === 'undefined' ? true : j.show
          };
        });

        state.filter_sources = Object.keys(state.sources);

        if (state.filter_sources.length) {
          const last_select = Lampa.Storage.cache('online_last_balanser', 3000, {});
          state.balanser = last_select[object.movie.id] || 
                          Lampa.Storage.get('online_balanser', state.filter_sources[0]);

          if (!state.sources[state.balanser]) {
            state.balanser = state.filter_sources[0];
          }

          if (!state.sources[state.balanser].show && !object.lampac_custom_select) {
            state.balanser = state.filter_sources[0];
          }

          state.source = state.sources[state.balanser].url;
          Lampa.Storage.set('active_balanser', state.balanser);
          resolve(json);
        } else {
          reject();
        }
      });
    };

    this.lifeSource = function() {
      return new Promise((resolve, reject) => {
        const url = this.requestParams(`${CONFIG.localhost}lifeevents?memkey=${this.memkey || ''}`);
        let resolved = false;

        const checkAndResolve = (json, any) => {
          if (json.accsdb) return reject(json);

          const last_balanser = this.getLastChoiceBalanser();
          
          if (!resolved) {
            const filtered = json.online.filter(c => 
              any ? c.show : c.show && c.name.toLowerCase() === last_balanser
            );

            if (filtered.length) {
              resolved = true;
              resolve(json.online.filter(c => c.show));
            } else if (any) {
              reject();
            }
          }
        };

        const poll = () => {
          network.timeout(CONFIG.timeouts.lifeSource);
          network.silent(
            account(url),
            (json) => {
              state.life_wait_times++;
              state.filter_sources = [];
              state.sources = {};

              json.online.forEach(j => {
                const name = helpers.balanserName(j);
                state.sources[name] = {
                  url: j.url,
                  name: j.name,
                  show: typeof j.show === 'undefined' ? true : j.show
                };
              });

              state.filter_sources = Object.keys(state.sources);

              filter.set('sort', state.filter_sources.map(e => ({
                title: state.sources[e].name,
                source: e,
                selected: e === state.balanser,
                ghost: !state.sources[e].show
              })));

              filter.chosen('sort', [
                state.sources[state.balanser] 
                  ? state.sources[state.balanser].name 
                  : state.balanser
              ]);

              checkAndResolve(json);

              const lastb = this.getLastChoiceBalanser();
              
              if (state.life_wait_times > CONFIG.limits.maxLifeWait || json.ready) {
                filter.render().find('.lampac-balanser-loader').remove();
                checkAndResolve(json, true);
              } else if (!resolved && state.sources[lastb]?.show) {
                checkAndResolve(json, true);
                timers.lifeWait = setTimeout(poll, 1000);
              } else {
                timers.lifeWait = setTimeout(poll, 1000);
              }
            },
            () => {
              state.life_wait_times++;
              if (state.life_wait_times > CONFIG.limits.maxLifeWait) {
                reject();
              } else {
                timers.lifeWait = setTimeout(poll, 1000);
              }
            }
          );
        };

        poll();
      });
    };

    this.createSource = function() {
      return new Promise((resolve, reject) => {
        const url = this.requestParams(`${CONFIG.localhost}lite/events?life=true`);
        network.timeout(CONFIG.timeouts.createSource);
        
        network.silent(
          account(url),
          (json) => {
            if (json.accsdb) return reject(json);

            if (json.life) {
              this.memkey = json.memkey;
              
              if (json.title) {
                if (object.movie.name) object.movie.name = json.title;
                if (object.movie.title) object.movie.title = json.title;
              }

              filter.render().find('.filter--sort').append(
                '<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>'
              );

              this.lifeSource()
                .then(this.startSource.bind(this))
                .then(resolve)
                .catch(reject);
            } else {
              this.startSource(json)
                .then(resolve)
                .catch(reject);
            }
          },
          reject
        );
      });
    };

    this.create = function() {
      return this.render();
    };

    this.search = function() {
      this.filter({ source: state.filter_sources }, this.getChoice());
      this.find();
    };

    this.find = function() {
      this.request(this.requestParams(state.source));
    };

    this.request = function(url) {
      state.number_of_requests++;

      if (state.number_of_requests < CONFIG.limits.maxRequests) {
        network.native(
          account(url),
          this.parse.bind(this),
          this.doesNotAnswer.bind(this),
          false,
          { dataType: 'text' }
        );

        clearTimeout(timers.requests);
        timers.requests = setTimeout(() => {
          state.number_of_requests = 0;
        }, CONFIG.limits.requestInterval);
      } else {
        this.empty();
      }
    };

    this.parseJsonDate = function(str, name) {
      try {
        const html = $(`<div>${str}</div>`);
        const elems = [];

        html.find(name).each(function() {
          const item = $(this);
          const data = JSON.parse(item.attr('data-json'));
          const season = item.attr('s');
          const episode = item.attr('e');
          let text = item.text();

          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
            if (text === 'По умолчанию') {
              text = object.movie.title;
            }
          }

          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
          
          elems.push(data);
        });

        return elems;
      } catch (e) {
        console.error('Parse error:', e);
        return [];
      }
    };

    this.getFileUrl = function(file, callback, waiting_rch) {
      if (Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')) {
        const newfile = { ...file, method: 'play', url: file.stream };
        callback(newfile, {});
      } else if (file.method === 'play') {
        callback(file, {});
      } else {
        Lampa.Loading.start(() => {
          Lampa.Loading.stop();
          Lampa.Controller.toggle('content');
          network.clear();
        });

        network.native(
          account(file.url),
          (json) => {
            if (json.rch) {
              if (waiting_rch) {
                Lampa.Loading.stop();
                callback(false, {});
              } else {
                this.rch(json, () => {
                  Lampa.Loading.stop();
                  this.getFileUrl(file, callback, true);
                });
              }
            } else {
              Lampa.Loading.stop();
              callback(json, json);
            }
          },
          () => {
            Lampa.Loading.stop();
            callback(false, {});
          }
        );
      }
    };

    this.toPlayElement = function(file) {
      return {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
        segments: file.segments,
        callback: file.mark,
        season: file.season,
        episode: file.episode,
        voice_name: file.voice_name
