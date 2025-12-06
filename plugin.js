/* bwarc-plugin — Optimized for Lampa
   Changes:
   - Button text -> "Дивитись ТУТ"
   - All balancers activated
   - Performance & stability improvements
   - Single-file ready to upload to GitHub as plugin.js
*/
(function () {
  'use strict';

  // -- Config
  const CONFIG = {
    api: 'lampac',
    localhost: 'https://rc.bwa.to/',
    nwsHost: 'https://rc.bwa.to',
    version: 149,
    defaultTimeout: 10000,
    shortTimeout: 3000,
    maxRequestsBurst: 10,
    watchCacheTTL: 5000,
    choiceCacheTTL: 3000,
    onlineChoiceSyncList: [
      "filmix","filmixtv","fxapi","rezka","rhsprem","lumex","videodb","collaps","collaps-dash","hdvb",
      "zetflix","kodik","ashdi","kinoukr","kinotochka","remux","iframevideo","cdnmovies","anilibria","animedia",
      "animego","animevost","animebesst","redheadsound","alloha","animelib","moonanime","kinopub","vibix",
      "vdbmovies","fancdn","cdnvideohub","vokino","rc/filmix","rc/fxapi","rc/rhs","vcdn","videocdn","mirage",
      "hydraflix","videasy","vidsrc","movpi","vidlink","twoembed","autoembed","smashystream","rgshows","pidtor",
      "videoseed","iptvonline","veoveo"
    ]
  };

  // default balancers list extracted/centralized (you can extend)
  const ALL_BALANCERS = CONFIG.onlineChoiceSyncList.slice();

  // -- Helpers
  const hostkey = CONFIG.nwsHost.replace(/^https?:\/\//, '');
  const uidKey = 'lampac_unic_id';

  function safeGetStorage(key, defaultValue) {
    try { return Lampa.Storage.get(key, defaultValue); } catch (e) { return defaultValue; }
  }

  function safeSetStorage(key, val) {
    try { Lampa.Storage.set(key, val); } catch (e) {}
  }

  function getOrCreateUID() {
    let unic = safeGetStorage(uidKey, '');
    if (!unic) {
      unic = Lampa.Utils.uid(8).toLowerCase();
      safeSetStorage(uidKey, unic);
    }
    return unic;
  }

  // minimal Android version getter (keeps original compatibility)
  function getAndroidVersion() {
    if (Lampa.Platform.is('android')) {
      try {
        const current = AndroidJS.appVersion().split('-');
        return parseInt(current.pop());
      } catch (e) { return 0; }
    }
    return 0;
  }

  // -- RCH / NWS helpers (kept compatible, but simplified)
  if (!window.rch_nws) window.rch_nws = {};
  if (!window.rch_nws[hostkey]) {
    window.rch_nws[hostkey] = {
      type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
      startTypeInvoke: false,
      rchRegistry: false,
      apkVersion: getAndroidVersion(),
      connectionId: ''
    };
  }

  window.rch_nws[hostkey].typeInvoke = function (host, call) {
    if (window.rch_nws[hostkey].startTypeInvoke) return call();
    window.rch_nws[hostkey].startTypeInvoke = true;

    const applyType = (good) => {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : (good ? 'cors' : 'web');
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) {
      applyType(true);
    } else {
      const net = new Lampa.Reguest();
      // quick check: try to reach cors endpoint — fallback to web
      net.silent(CONFIG.nwsHost.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check',
        () => applyType(true),
        () => applyType(false),
        false, { dataType: 'text', timeout: 3000 });
    }
  };

  window.rch_nws[hostkey].Registry = function (client, startConnection) {
    window.rch_nws[hostkey].typeInvoke(CONFIG.nwsHost, function () {
      const payload = {
        version: CONFIG.version,
        host: location.host,
        rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : (window.rch_nws[hostkey].type || ''),
        apkVersion: window.rch_nws[hostkey].apkVersion,
        player: Lampa.Storage.field('player'),
        account_email: Lampa.Storage.get('account_email'),
        unic_id: getOrCreateUID(),
        profile_id: Lampa.Storage.get('lampac_profile_id', ''),
        token: ''
      };

      client.invoke("RchRegistry", JSON.stringify(payload));

      if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
        if (startConnection) startConnection();
        return;
      }

      window.rch_nws[hostkey].rchRegistry = true;

      client.on('RchRegistry', () => { if (startConnection) startConnection(); });

      client.on("RchClient", (rchId, url, data, headers, returnHeaders) => {
        const network = new Lampa.Reguest();
        const result = (html) => {
          try {
            if ((typeof html === 'object' || Array.isArray(html))) html = JSON.stringify(html);
            if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
              const compressionStream = new CompressionStream('gzip');
              const encoder = new TextEncoder();
              const readable = new ReadableStream({
                start(ctrl) { ctrl.enqueue(encoder.encode(html)); ctrl.close(); }
              });
              const compressedStream = readable.pipeThrough(compressionStream);
              new Response(compressedStream).arrayBuffer().then((compressedBuffer) => {
                const compressedArray = new Uint8Array(compressedBuffer);
                if (compressedArray.length > html.length) client.invoke("RchResult", rchId, html);
                else {
                  $.ajax({
                    url: CONFIG.localhost + 'rch/gzresult?id=' + rchId,
                    type: 'POST',
                    data: compressedArray,
                    async: true,
                    cache: false,
                    contentType: false,
                    processData: false
                  }).fail(() => client.invoke("RchResult", rchId, html));
                }
              }).catch(() => client.invoke("RchResult", rchId, html));
            } else client.invoke("RchResult", rchId, html);
          } catch (e) { client.invoke("RchResult", rchId, ''); }
        };

        if (url === 'eval') {
          try { result(eval(data)); } catch (e) { result(''); }
        } else if (url === 'evalrun') {
          try { eval(data); } catch (e) {}
        } else if (url === 'ping') {
          result('pong');
        } else {
          network["native"](url, result, () => result(''), data, { dataType: 'text', timeout: 8000, headers: headers, returnHeaders: returnHeaders });
        }
      });

      client.on('Connected', (connectionId) => {
        window.rch_nws[hostkey].connectionId = connectionId;
      });
      client.on('Closed', () => {});
      client.on('Error', (err) => { console.log('RCH error', err); });
    });
  };

  // rchRun wrapper (loads nws-client only once)
  function rchRun(json, call) {
    if (typeof NativeWsClient === 'undefined') {
      Lampa.Utils.putScript([CONFIG.nwsHost + "/js/nws-client-es5.js?v18112025"], () => {},
        false, () => { rchInvoke(json, call); }, true);
    } else rchInvoke(json, call);
  }

  function rchInvoke(json, call) {
    if (!window.nwsClient) window.nwsClient = {};
    if (window.nwsClient[hostkey] && window.nwsClient[hostkey].socket) window.nwsClient[hostkey].socket.close();

    window.nwsClient[hostkey] = new NativeWsClient(json.nws, { autoReconnect: false });
    window.nwsClient[hostkey].on('Connected', (connectionId) => {
      window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], () => { call(); });
    });
    window.nwsClient[hostkey].connect();
  }

  // add account params to urls
  function account(url) {
    url = String(url);
    if (url.indexOf('account_email=') === -1) {
      const email = Lampa.Storage.get('account_email');
      if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    }
    if (url.indexOf('uid=') === -1) {
      const uid = getOrCreateUID();
      if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    }
    if (url.indexOf('token=') === -1) {
      const token = '';
      if (token) url = Lampa.Utils.addUrlComponent(url, 'token=' + token);
    }
    if (url.indexOf('nws_id=') === -1 && window.rch_nws && window.rch_nws[hostkey]) {
      const nws_id = window.rch_nws[hostkey].connectionId || '';
      if (nws_id) url = Lampa.Utils.addUrlComponent(url, 'nws_id=' + encodeURIComponent(nws_id));
    }
    return url;
  }

  // -- Component core (optimized)
  function component(object) {
    const network = new Lampa.Reguest();
    const scroll = new Lampa.Scroll({ mask: true, over: true });
    const files = new Lampa.Explorer(object);
    const filter = new Lampa.Filter(object);

    let sources = {};
    let filter_sources = [];
    let balanser = '';
    let sourceUrl = '';
    let initialized = false;
    let balanserTimer = null;
    let images = [];
    let last = false;         // <<< Додано: ініціалізація last, щоб уникнути ReferenceError
    let numberOfRequests = 0;
    let numberResetTimer = null;
    let lifeWaitTimer = null;
    let lifeWaitTimes = 0;
    let memkey = '';

    // local cache for balansers with search support (request once)
    if (typeof window.__bwa_balancers_with_search === 'undefined') {
      window.__bwa_balancers_with_search = null;
      network.timeout(CONFIG.defaultTimeout);
      network.silent(account(CONFIG.localhost + 'lite/withsearch'), (json) => {
        window.__bwa_balancers_with_search = Array.isArray(json) ? json : [];
      }, () => { window.__bwa_balancers_with_search = []; });
    }

    function balanserNameEntry(j) {
      const bals = j.balanser;
      const name = (j.name || '').split(' ')[0];
      return (bals || name).toLowerCase();
    }

    function setClarificationSearch(value) {
      try {
        const id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
        const all = Lampa.Storage.get('clarification_search', {}) || {};
        all[id] = value;
        Lampa.Storage.set('clarification_search', all);
      } catch (e) {}
    }

    function clearClarificationSearch() {
      try {
        const id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
        const all = Lampa.Storage.get('clarification_search', {}) || {};
        delete all[id];
        Lampa.Storage.set('clarification_search', all);
      } catch (e) {}
    }

    function getClarificationSearch() {
      try {
        const id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
        const all = Lampa.Storage.get('clarification_search', {}) || {};
        return all[id];
      } catch (e) { return undefined; }
    }

    // initialize component
    this.initialize = function () {
      const self = this;
      this.loading(true);

      // filter search handler
      filter.onSearch = (value) => {
        setClarificationSearch(value);
        Lampa.Activity.replace({ search: value, clarification: true, similar: true });
      };

      filter.onBack = () => self.start();

      // avoid frequent balanser changes when hovering
      filter.render().find('.selector').on('hover:enter', () => clearInterval(balanserTimer));

      // move search field to filter
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));

      filter.onSelect = (type, a, b) => {
        if (type === 'filter') {
          if (a.reset) {
            clearClarificationSearch();
            this.replaceChoice({ season: 0, voice: 0, voice_url: '', voice_name: '' });
            setTimeout(() => { Lampa.Select.close(); Lampa.Activity.replace({ clarification: 0, similar: 0 }); }, 10);
          } else {
            const url = filter_find[a.stype][b.index].url;
            const choice = this.getChoice();
            if (a.stype === 'voice') {
              choice.voice_name = filter_find.voice[b.index].title;
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
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser'));

      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      Lampa.Controller.enable('content');
      this.loading(false);

      // if source explicitly passed (from external call)
      if (object.balanser) {
        files.render().find('.filter--search').remove();
        sources = {};
        sources[object.balanser] = { name: object.balanser, url: object.url, show: true };
        balanser = object.balanser;
        filter_sources = [object.balanser];
        sourceUrl = object.url;
        return network["native"](account(object.url.replace('rjson=', 'nojson=')), this.parse.bind(this), () => {
          files.render().find('.torrent-filter').remove();
          this.empty();
        }, false, { dataType: 'text' });
      }

      // otherwise get external ids and create source
      this.externalids().then(() => this.createSource()).then((json) => {
        // hide search filter if balancer without search support
        if (!(window.__bwa_balancers_with_search || []).find(b => balanser.slice(0, b.length) === b)) {
          filter.render().find('.filter--search').addClass('hide');
        }
        this.search();
      }).catch(e => this.noConnectToServer(e));
    };

    // externalids fetch (kept same semantics but with Promise)
    this.externalids = function () {
      return new Promise((resolve) => {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          const query = [];
          query.push('id=' + encodeURIComponent(object.movie.id));
          query.push('serial=' + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
          if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
          const url = CONFIG.localhost + 'externalids?' + query.join('&');
          network.timeout(CONFIG.defaultTimeout);
          network.silent(account(url), (json) => {
            for (const k in json) object.movie[k] = json[k];
            resolve();
          }, () => resolve());
        } else resolve();
      });
    };

    this.updateBalanser = function (balanser_name) {
      try {
        const last_select_balanser = Lampa.Storage.cache('online_last_balanser', CONFIG.choiceCacheTTL, {});
        last_select_balanser[object.movie.id] = balanser_name;
        Lampa.Storage.set('online_last_balanser', last_select_balanser);
      } catch (e) {}
    };

    this.changeBalanser = function (balanser_name) {
      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      const to = this.getChoice(balanser_name);
      const from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };

    this.requestParams = function (url) {
      const query = [];
      const card_source = object.movie.source || 'tmdb';
      query.push('id=' + encodeURIComponent(object.movie.id));
      if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
      if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
      if (object.movie.tmdb_id) query.push('tmdb_id=' + (object.movie.tmdb_id || ''));
      query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
      query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
      query.push('serial=' + (object.movie.name ? 1 : 0));
      query.push('original_language=' + (object.movie.original_language || ''));
      query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
      query.push('source=' + card_source);
      query.push('clarification=' + (object.clarification ? 1 : 0));
      query.push('similar=' + (object.similar ? true : false));
      query.push('rchtype=' + ((window.rch_nws && window.rch_nws[hostkey]) ? window.rch_nws[hostkey].type : ''));
      if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };

    this.getLastChoiceBalanser = function () {
      const last_select_balanser = Lampa.Storage.cache('online_last_balanser', CONFIG.choiceCacheTTL, {});
      if (last_select_balanser[object.movie.id]) return last_select_balanser[object.movie.id];
      return Lampa.Storage.get('online_balanser', filter_sources.length ? filter_sources[0] : '');
    };

    // startSource build sources object from remote list
    this.startSource = function (json) {
      return new Promise((resolve, reject) => {
        json.forEach(j => {
          const name = balanserNameEntry(j);
          sources[name] = { url: j.url, name: j.name, show: typeof j.show === 'undefined' ? true : j.show };
        });

        // ensure all known balancers are present and shown
        ALL_BALANCERS.forEach(b => {
          if (!sources[b]) sources[b] = { url: CONFIG.localhost + 'lite/' + b, name: b, show: true };
          else sources[b].show = true; // force activate
        });

        filter_sources = Lampa.Arrays.getKeys(sources);

        if (filter_sources.length) {
          const last_select_balanser = Lampa.Storage.cache('online_last_balanser', CONFIG.choiceCacheTTL, {});
          if (last_select_balanser[object.movie.id]) {
            balanser = last_select_balanser[object.movie.id];
          } else {
            balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
          }
          if (!sources[balanser]) balanser = filter_sources[0];
          if (!sources[balanser].show && !object.lampac_custom_select) balanser = filter_sources[0];
          sourceUrl = sources[balanser].url;
          Lampa.Storage.set('active_balanser', balanser);
          resolve(json);
        } else reject();
      });
    };

    // lifeSource tries to get live events; it updates filter list periodically with backoff
    this.lifeSource = function () {
      return new Promise((resolve, reject) => {
        const url = this.requestParams(CONFIG.localhost + 'lifeevents?memkey=' + (memkey || ''));
        let found = false;
        const processJson = (json, any) => {
          if (json.accsdb) return reject(json);
          if (!found) {
            const filtered = json.online.filter(c => any ? c.show : (c.show && c.name.toLowerCase() === this.getLastChoiceBalanser()));
            if (filtered.length) {
              found = true;
              resolve(json.online.filter(c => c.show));
            } else if (any) reject();
          }
        };

        const fin = () => {
          network.timeout(CONFIG.shortTimeout);
          network.silent(account(url), (json) => {
            lifeWaitTimes++;
            filter_sources = [];
            sources = {};
            json.online.forEach(j => {
              const name = balanserNameEntry(j);
              sources[name] = { url: j.url, name: j.name, show: typeof j.show === 'undefined' ? true : j.show };
            });
            filter_sources = Lampa.Arrays.getKeys(sources);
            filter.set('sort', filter_sources.map(e => ({ title: sources[e].name, source: e, selected: e === balanser, ghost: !sources[e].show })));
            filter.chosen('sort', [sources[balanser] ? sources[balanser].name : balanser]);
            processJson(json);
            const lastb = this.getLastChoiceBalanser();
            if (lifeWaitTimes > 15 || json.ready) {
              filter.render().find('.lampac-balanser-loader').remove();
              processJson(json, true);
            } else if (!found && sources[lastb] && sources[lastb].show) {
              processJson(json, true);
              lifeWaitTimer = setTimeout(fin, 1000);
            } else {
              lifeWaitTimer = setTimeout(fin, 1000);
            }
          }, () => {
            lifeWaitTimes++;
            if (lifeWaitTimes > 15) reject();
            else lifeWaitTimer = setTimeout(fin, 1000);
          });
        };

        fin();
      });
    };

    // createSource: fetches list and chooses initial one
    this.createSource = function () {
      return new Promise((resolve, reject) => {
        const url = this.requestParams(CONFIG.localhost + 'lite/events?life=true');
        network.timeout(15000);
        network.silent(account(url), (json) => {
          if (json.accsdb) return reject(json);
          if (json.life) {
            memkey = json.memkey;
            if (json.title) {
              if (object.movie.name) object.movie.name = json.title;
              if (object.movie.title) object.movie.title = json.title;
            }
            filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width:1.2em;height:1.2em;margin-top:0;background:url(./img/loader.svg) no-repeat 50% 50%;background-size:contain;margin-left:0.5em"></span>');
            this.lifeSource().then(this.startSource.bind(this)).then(resolve).catch(reject);
          } else {
            this.startSource(json).then(resolve).catch(reject);
          }
        }, reject);
      });
    };

    // small helpers and request flow
    this.create = function () { return this.render(); };
    this.search = function () {
      this.filter({ source: filter_sources }, this.getChoice());
      this.find();
    };
    this.find = function () { this.request(this.requestParams(sourceUrl)); };

    this.request = function (url) {
      numberOfRequests++;
      if (numberOfRequests < CONFIG.maxRequestsBurst) {
        network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, { dataType: 'text' });
        clearTimeout(numberResetTimer);
        numberResetTimer = setTimeout(() => numberOfRequests = 0, 4000);
      } else this.empty();
    };

    // parses elements with .videos__item and .videos__button
    this.parseJsonDate = function (str, name) {
      try {
        const html = $('<div>' + str + '</div>');
        const elems = [];
        html.find(name).each(function () {
          const item = $(this);
          const data = JSON.parse(item.attr('data-json') || '{}');
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
            if (text === 'По умолчанию') text = object.movie.title;
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
          elems.push(data);
        });
        return elems;
      } catch (e) { return []; }
    };

    // getFileUrl with rch handling
    this.getFileUrl = function (file, call, waiting_rch) {
      const self = this;

      if (Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')) {
        const newfile = Lampa.Arrays.clone(file);
        newfile.method = 'play';
        newfile.url = file.stream;
        return call(newfile, {});
      }

      if (file.method === 'play') return call(file, {});
      Lampa.Loading.start(function () {
        Lampa.Loading.stop();
        Lampa.Controller.toggle('content');
        network.clear();
      });

      network["native"](account(file.url), function (json) {
        if (json && json.rch) {
          if (waiting_rch) {
            Lampa.Loading.stop();
            call(false, {});
          } else {
            self.rch(json, function () {
              Lampa.Loading.stop();
              self.getFileUrl(file, call, true);
            });
          }
        } else {
          Lampa.Loading.stop();
          call(json, json || {});
        }
      }, function () {
        Lampa.Loading.stop();
        call(false, {});
      });
    };

    this.toPlayElement = function (file) {
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
      };
    };

    this.orUrlReserve = function (data) {
      if (data.url && typeof data.url === 'string' && data.url.indexOf(" or ") !== -1) {
        const urls = data.url.split(" or ");
        data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };

    this.setDefaultQuality = function (data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (const q in data.quality) {
          if (parseInt(q) === Lampa.Storage.field('video_quality_default')) {
            data.url = data.quality[q];
            this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1) data.quality[q] = data.quality[q].split(" or ")[0];
        }
      }
    };

    // display + onEnter play flow optimized
    this.display = function (videos) {
      const self = this;
      this.draw(videos, {
        onEnter: function (item, html) {
          self.getFileUrl(item, function (json, json_call) {
            if (json && json.url) {
              const playlist = [];
              const first = self.toPlayElement(item);
              first.url = json.url;
              first.headers = json_call.headers || json.headers;
              first.quality = json_call.quality || item.qualitys;
              first.segments = json_call.segments || item.segments;
              first.hls_manifest_timeout = json_call.hls_manifest_timeout || json.hls_manifest_timeout;
              first.subtitles = json.subtitles;
              first.subtitles_call = json_call.subtitles_call || json.subtitles_call;
              if (json.vast && json.vast.url) {
                first.vast_url = json.vast.url;
                first.vast_msg = json.vast.msg;
                first.vast_region = json.vast.region;
                first.vast_platform = json.vast.platform;
                first.vast_screen = json.vast.screen;
              }
              self.orUrlReserve(first);
              self.setDefaultQuality(first);

              if (item.season) {
                videos.forEach(function (elem) {
                  const cell = self.toPlayElement(elem);
                  if (elem === item) cell.url = json.url;
                  else {
                    if (elem.method === 'call') {
                      if (Lampa.Storage.field('player') !== 'inner') {
                        cell.url = elem.stream;
                        delete cell.quality;
                      } else {
                        cell.url = function (call2) {
                          self.getFileUrl(elem, function (stream, stream_json) {
                            if (stream && stream.url) {
                              cell.url = stream.url;
                              cell.quality = stream_json.quality || elem.qualitys;
                              cell.segments = stream_json.segments || elem.segments;
                              cell.subtitles = stream.subtitles;
                              self.orUrlReserve(cell);
                              self.setDefaultQuality(cell);
                              elem.mark();
                            } else {
                              cell.url = '';
                              Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
                            }
                            call2();
                          }, function () {
                            cell.url = '';
                            call2();
                          });
                        };
                      }
                    } else cell.url = elem.url;
                  }
                  self.orUrlReserve(cell);
                  self.setDefaultQuality(cell);
                  playlist.push(cell);
                });
              } else playlist.push(first);

              if (playlist.length > 1) first.playlist = playlist;
              if (first.url) {
                const element = first;
                element.isonline = true;
                // attempt to play via Lampa.Player
                Lampa.Player.play(element);
                Lampa.Player.playlist(playlist);
                if (element.subtitles_call) self.loadSubtitles(element.subtitles_call);
                item.mark();
                self.updateBalanser(balanser);
              } else {
                Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
              }
            } else Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
          }, true);
        },
        onContextMenu: function (item, html, data, call) {
          self.getFileUrl(item, function (stream) {
            call({ file: stream.url, quality: item.qualitys });
          }, true);
        }
      });

      this.filter({
        season: filter_find.season.map(s => s.title),
        voice: filter_find.voice.map(b => b.title)
      }, this.getChoice());
    };

    this.loadSubtitles = function (link) {
      network.silent(account(link), function (subs) {
        Lampa.Player.subtitles(subs);
      });
    };

    // parsing and routing results
    this.parse = function (str) {
      const self = this;
      let json = Lampa.Arrays.decodeJson(str, {});
      if (Lampa.Arrays.isObject(str) && str.rch) json = str;
      if (json.rch) return this.rch(json);

      try {
        const items = this.parseJsonDate(str, '.videos__item');
        const buttons = this.parseJsonDate(str, '.videos__button');

        if (items.length === 1 && items[0].method === 'link' && !items[0].similar) {
          filter_find.season = items.map(s => ({ title: s.text, url: s.url }));
          this.replaceChoice({ season: 0 });
          this.request(items[0].url);
        } else {
          this.activity.loader(false);
          const videos = items.filter(v => v.method === 'play' || v.method === 'call');
          const similar = items.filter(v => v.similar);

          if (videos.length) {
            if (buttons.length) {
              filter_find.voice = buttons.map(b => ({ title: b.text, url: b.url }));
              const select_voice_url = this.getChoice(balanser).voice_url;
              const select_voice_name = this.getChoice(balanser).voice_name;
              const find_voice_url = buttons.find(v => v.url === select_voice_url);
              const find_voice_name = buttons.find(v => v.text === select_voice_name);
              const find_voice_active = buttons.find(v => v.active);

              if (find_voice_url && !find_voice_url.active) {
                this.replaceChoice({ voice: buttons.indexOf(find_voice_url), voice_name: find_voice_url.text });
                this.request(find_voice_url.url);
              } else if (find_voice_name && !find_voice_name.active) {
                this.replaceChoice({ voice: buttons.indexOf(find_voice_name), voice_name: find_voice_name.text });
                this.request(find_voice_name.url);
              } else {
                if (find_voice_active) this.replaceChoice({ voice: buttons.indexOf(find_voice_active), voice_name: find_voice_active.text });
                this.display(videos);
              }
            } else {
              this.replaceChoice({ voice: 0, voice_url: '', voice_name: '' });
              this.display(videos);
            }
          } else if (items.length) {
            if (similar.length) {
              this.similars(similar);
              this.activity.loader(false);
            } else {
              filter_find.season = items.map(s => ({ title: s.text, url: s.url }));
              const select_season = this.getChoice(balanser).season;
              let season = filter_find.season[select_season];
              if (!season) season = filter_find.season[0];
              this.request(season.url);
            }
          } else this.doesNotAnswer(json);
        }
      } catch (e) {
        this.doesNotAnswer(e);
      }
    };

    // similar items view
    this.similars = function (json) {
      const self = this;
      scroll.clear();
      json.forEach(elem => {
        elem.title = elem.text;
        elem.info = '';
        const info = [];
        const year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        const name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || '';
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        const item = Lampa.Template.get('lampac_prestige_folder', elem);

        if (elem.img) {
          const image = $('<img style="height:7em;width:7em;border-radius:.3em;"/>');
          item.find('.online-prestige__folder').empty().append(image);
          if (elem.img.charAt(0) === '/') elem.img = CONFIG.localhost + elem.img.substring(1);
          if (elem.img.indexOf('/proxyimg') !== -1) elem.img = account(elem.img);
          Lampa.Utils.imgLoad(image, elem.img);
        }

        item.on('hover:enter', () => { self.reset(); self.request(elem.url); })
          .on('hover:focus', (e) => { last = e.target; scroll.update($(e.target), true); });

        scroll.append(item);
      });

      this.filter({
        season: filter_find.season.map(s => s.title),
        voice: filter_find.voice.map(b => b.title)
      }, this.getChoice());

      Lampa.Controller.enable('content');
    };

    // choice storage helpers
    this.getChoice = function (for_balanser) {
      const data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), CONFIG.choiceCacheTTL, {});
      const save = data[object.movie.id] || {};
      Lampa.Arrays.extend(save, { season: 0, voice: 0, voice_name: '', voice_id: 0, episodes_view: {}, movie_view: '' });
      return save;
    };

    this.saveChoice = function (choice, for_balanser) {
      const data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), CONFIG.choiceCacheTTL, {});
      data[object.movie.id] = choice;
      Lampa.Storage.set('online_choice_' + (for_balanser || balanser), data);
      this.updateBalanser(for_balanser || balanser);
    };

    this.replaceChoice = function (choice, for_balanser) {
      const to = this.getChoice(for_balanser);
      Lampa.Arrays.extend(to, choice, true);
      this.saveChoice(to, for_balanser);
    };

    this.clearImages = function () {
      images.forEach(img => { img.onerror = img.onload = null; img.src = ''; });
      images = [];
    };

    // reset / empty flows
    this.reset = function () {
      last = false;
      clearInterval(balanserTimer);
      network.clear();
      this.clearImages();
      scroll.render().find('.empty').remove();
      scroll.clear();
      scroll.reset();
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
    };

    this.loading = function (status) {
      if (status) this.activity.loader(true);
      else { this.activity.loader(false); this.activity.toggle(); }
    };

    // filter builder — optimized to reduce DOM reflows
    this.filter = function (filter_items, choice) {
      const select = [];
      const add = (type, title) => {
        const need = this.getChoice();
        const items = filter_items[type];
        const subitems = [];
        const value = need[type];
        items.forEach((name, i) => subitems.push({ title: name, selected: value === i, index: i }));
        select.push({ title: title, subtitle: items[value], items: subitems, stype: type });
      };

      filter_items.source = filter_sources;
      select.push({ title: Lampa.Lang.translate('torrent_parser_reset'), reset: true });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(e => ({ title: sources[e].name, source: e, selected: e === balanser, ghost: !sources[e].show })));
      this.selected(filter_items);
    };

    this.selected = function (filter_items) {
      const need = this.getChoice();
      const select = [];
      for (const i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i === 'voice') select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          else if (i !== 'source') {
            if (filter_items.season.length >= 1) select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
          }
        }
      }
      filter.chosen('filter', select);
      filter.chosen('sort', [sources[balanser].name]);
    };

    this.getEpisodes = function (season, call) {
      const episodes = [];
      let tmdb_id = object.movie.id;
      if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') === -1) tmdb_id = object.movie.tmdb_id;
      if (typeof tmdb_id === 'number' && object.movie.name) {
        Lampa.Api.sources.tmdb.get('tv/' + tmdb_id + '/season/' + season, {}, function (data) {
          call(data.episodes || []);
        }, function () { call([]); });
      } else call([]);
    };

    this.watched = function (set) {
      const file_id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
      const watched = Lampa.Storage.cache('online_watched_last', CONFIG.watchCacheTTL, {});
      if (set) {
        if (!watched[file_id]) watched[file_id] = {};
        Lampa.Arrays.extend(watched[file_id], set, true);
        Lampa.Storage.set('online_watched_last', watched);
        this.updateWatched();
      } else return watched[file_id];
    };

    this.updateWatched = function () {
      const watched = this.watched();
      const body = scroll.body().find('.online-prestige-watched .online-prestige-watched__body').empty();
      if (watched) {
        const line = [];
        if (watched.balanser_name) line.push(watched.balanser_name);
        if (watched.voice_name) line.push(watched.voice_name);
        if (watched.season) line.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + watched.season);
        if (watched.episode) line.push(Lampa.Lang.translate('torrent_serial_episode') + ' ' + watched.episode);
        line.forEach(n => body.append('<span>' + n + '</span>'));
      } else body.append('<span>' + Lampa.Lang.translate('lampac_no_watch_history') + '</span>');
    };

    // draw items (kept robust with fewer reflows)
    this.draw = function (items, params = {}) {
      if (!items.length) return this.empty();
      scroll.clear();
      if (!object.balanser) scroll.append(Lampa.Template.get('lampac_prestige_watched', {}));
      this.updateWatched();

      this.getEpisodes(items[0].season, (episodes) => {
        const viewed = Lampa.Storage.cache('online_view', 5000, []);
        const serial = !!object.movie.name;
        const choice = this.getChoice();
        const fully = window.innerWidth > 480;
        let scroll_to_element = false;
        let scroll_to_mark = false;

        items.forEach((element, index) => {
          const episode = serial && episodes.length && !params.similars ? episodes.find(e => e.episode_number === element.episode) : false;
          const episode_num = element.episode || index + 1;
          const episode_last = choice.episodes_view[element.season];
          let voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name || (serial ? 'Неизвестно' : element.text) || 'Неизвестно';

          if (element.quality) {
            element.qualitys = element.quality;
            element.quality = Lampa.Arrays.getKeys(element.quality)[0];
          }

          Lampa.Arrays.extend(element, {
            voice_name,
            info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name,
            quality: '',
            time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
          });

          const hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
          const hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
          element.timeline = Lampa.Timeline.view(hash_timeline);

          if (episode) {
            element.title = episode.name;
            if (element.info.length < 30 && episode.vote_average) element.info = Lampa.Template.get('lampac_prestige_rate', { rate: parseFloat(episode.vote_average + '').toFixed(1) }, true) + element.info;
            if (episode.air_date && fully) element.info += '<span class="online-prestige-split">●</span>' + Lampa.Utils.parseTime(episode.air_date).full;
          } else if (object.movie.release_date && fully) {
            element.info += '<span class="online-prestige-split">●</span>' + Lampa.Utils.parseTime(object.movie.release_date).full;
          }

          if (!serial && object.movie.tagline && element.info.length < 30) element.info += '<span class="online-prestige-split">●</span>' + object.movie.tagline;

          const html = Lampa.Template.get('lampac_prestige_full', element);
          const loader = html.find('.online-prestige__loader');
          const image = html.find('.online-prestige__img');
          if (object.balanser) image.hide();

          if (!serial) {
            if (choice.movie_view === hash_behold) scroll_to_element = html;
          } else if (typeof episode_last !== 'undefined' && episode_last === episode_num) scroll_to_element = html;

          if (serial && !episode) { image.append('<div class="online-prestige__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>'); loader.remove(); }
          else if (!serial && object.movie.backdrop_path === 'undefined') loader.remove();
          else {
            const img = html.find('img')[0];
            img.onerror = function () { img.src = './img/img_broken.svg'; };
            img.onload = function () { image.addClass('online-prestige__img--loaded'); loader.remove(); if (serial) image.append('<div class="online-prestige__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>'); };
            img.src = Lampa.TMDB.image('t/p/w300' + (episode ? episode.still_path : object.movie.backdrop_path));
            images.push(img);
          }

          html.find('.online-prestige__timeline').append(Lampa.Timeline.render(element.timeline));

          if (viewed.indexOf(hash_behold) !== -1) {
            scroll_to_mark = html;
            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
          }

          element.mark = function () {
            let viewedArr = Lampa.Storage.cache('online_view', 5000, []);
            if (viewedArr.indexOf(hash_behold) === -1) {
              viewedArr.push(hash_behold);
              Lampa.Storage.set('online_view', viewedArr);
              if (html.find('.online-prestige__viewed').length === 0) html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
            }
            let ch = self.getChoice();
            if (!serial) ch.movie_view = hash_behold;
            else ch.episodes_view[element.season] = episode_num;
            self.saveChoice(ch);
            let voice_name_text = ch.voice_name || element.voice_name || element.title;
            if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
            self.watched({ balanser: balanser, balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser), voice_id: ch.voice_id, voice_name: voice_name_text, episode: element.episode, season: element.season });
          };

          element.unmark = function () {
            let viewedArr = Lampa.Storage.cache('online_view', 5000, []);
            if (viewedArr.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewedArr, hash_behold);
              Lampa.Storage.set('online_view', viewedArr);
              Lampa.Storage.remove('online_view', hash_behold);
              html.find('.online-prestige__viewed').remove();
            }
          };

          element.timeclear = function () {
            element.timeline.percent = 0; element.timeline.time = 0; element.timeline.duration = 0; Lampa.Timeline.update(element.timeline);
          };

          html.on('hover:enter', () => {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            if (params.onEnter) params.onEnter(element, html);
          }).on('hover:focus', (e) => {
            last = e.target;
            if (params.onFocus) params.onFocus(element, html);
            scroll.update($(e.target), true);
          });

          if (params.onRender) params.onRender(element, html);

          self.contextMenu({
            html: html,
            element: element,
            onFile: function (call) { if (params.onContextMenu) params.onContextMenu(element, html, null, call); },
            onClearAllMark: function () { items.forEach(elem => elem.unmark()); },
            onClearAllTime: function () { items.forEach(elem => elem.timeclear()); }
          });

          scroll.append(html);
        });

        // append left episodes if serial
        if (serial && episodes.length > items.length && !params.similars) {
          const left = episodes.slice(items.length);
          left.forEach(episode => {
            const info = [];
            if (episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate', { rate: parseFloat(episode.vote_average + '').toFixed(1) }, true));
            if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
            const air = new Date((episode.air_date + '').replace(/-/g, '/'));
            const now = Date.now();
            const day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
            const txt = Lampa.Lang.translate('full_episode_days_left') + ': ' + day;
            const html = Lampa.Template.get('lampac_prestige_full', {
              time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
              info: info.length ? info.map(i => '<span>' + i + '</span>').join('<span class="online-prestige-split">●</span>') : '',
              title: episode.name,
              quality: day > 0 ? txt : ''
            });
            const loader = html.find('.online-prestige__loader');
            const image = html.find('.online-prestige__img');
            const season = items[0] ? items[0].season : 1;
            html.find('.online-prestige__timeline').append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join('')))));
            const img = html.find('img')[0];
            if (episode.still_path) {
              img.onerror = function () { img.src = './img/img_broken.svg'; };
              img.onload = function () { image.addClass('online-prestige__img--loaded'); loader.remove(); image.append('<div class="online-prestige__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>'); };
              img.src = Lampa.TMDB.image('t/p/w300' + episode.still_path);
              images.push(img);
            } else {
              loader.remove();
              image.append('<div class="online-prestige__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>');
            }
            html.on('hover:focus', (e) => { last = e.target; scroll.update($(e.target), true); });
            html.css('opacity', '0.5');
            scroll.append(html);
          });
        }

        if (scroll_to_element) last = scroll_to_element[0];
        else if (scroll_to_mark) last = scroll_to_mark[0];

        Lampa.Controller.enable('content');
      });
    };

    // context menu builder (kept as before with small improvements)
    this.contextMenu = function (params) {
      params.html.on('hover:long', function () {
        const enabled = Lampa.Controller.enabled().name;
        const menu = [];

        if (Lampa.Platform.is('webos')) menu.push({ title: Lampa.Lang.translate('player_lauch') + ' - Webos', player: 'webos' });
        if (Lampa.Platform.is('android')) menu.push({ title: Lampa.Lang.translate('player_lauch') + ' - Android', player: 'android' });
        menu.push({ title: Lampa.Lang.translate('player_lauch') + ' - Lampa', player: 'lampa' });
        menu.push({ title: Lampa.Lang.translate('lampac_video'), separator: true });
        menu.push({ title: Lampa.Lang.translate('torrent_parser_label_title'), mark: true });
        menu.push({ title: Lampa.Lang.translate('torrent_parser_label_cancel_title'), unmark: true });
        menu.push({ title: Lampa.Lang.translate('time_reset'), timeclear: true });
        menu.push({ title: Lampa.Lang.translate('lampac_clear_all_marks'), clearallmark: true });
        menu.push({ title: Lampa.Lang.translate('lampac_clear_all_timecodes'), timeclearall: true });

        if (window.lampac_online_context_menu) window.lampac_online_context_menu.push(menu, params);

        menu.push({ title: Lampa.Lang.translate('more'), separator: true });

        if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) menu.push({ title: Lampa.Lang.translate('lampac_voice_subscribe'), subscribe: true });

        Lampa.Select.show({
          title: Lampa.Lang.translate('title_action'),
          items: menu,
          onBack() { Lampa.Controller.toggle(enabled); },
          onSelect(a) {
            if (a.mark) params.element.mark();
            if (a.unmark) params.element.unmark();
            if (a.timeclear) params.element.timeclear();
            if (a.clearallmark) params.onClearAllMark();
            if (a.timeclearall) params.onClearAllTime();
            if (window.lampac_online_context_menu) window.lampac_online_context_menu.onSelect(a, params);
            Lampa.Controller.toggle(enabled);
            if (a.player) { Lampa.Player.runas(a.player); params.html.trigger('hover:enter'); }
            if (a.copylink) {
              if (params.extra && params.extra.quality) {
                const qual = [];
                for (const i in params.extra.quality) qual.push({ title: i, file: params.extra.quality[i] });
                Lampa.Select.show({
                  title: Lampa.Lang.translate('settings_server_links'),
                  items: qual,
                  onBack() { Lampa.Controller.toggle(enabled); },
                  onSelect(b) { Lampa.Utils.copyTextToClipboard(b.file, () => Lampa.Noty.show(Lampa.Lang.translate('copy_secuses')), () => Lampa.Noty.show(Lampa.Lang.translate('copy_error'))); }
                });
              } else {
                Lampa.Utils.copyTextToClipboard(params.extra.file, () => Lampa.Noty.show(Lampa.Lang.translate('copy_secuses')), () => Lampa.Noty.show(Lampa.Lang.translate('copy_error')));
              }
            }
            if (a.subscribe) {
              Lampa.Account.subscribeToTranslation({
                card: object.movie,
                season: params.element.season,
                episode: params.element.translate_episode_end,
                voice: params.element.translate_voice
              }, function () { Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success')); }, function () { Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_error')); });
            }
          }
        });
      }).on('hover:focus', function () {
        if (Lampa.Helper) Lampa.Helper.show('online_file', Lampa.Lang.translate('helper_online_file'), params.html);
      });
    };

    // empty / error handlers
    this.empty = function () {
      const html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('empty_title_two'));
      html.find('.online-empty__time').text(Lampa.Lang.translate('empty_text'));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };

    this.noConnectToServer = function (er) {
      const html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('title_error'));
      html.find('.online-empty__time').text(er && er.accsdb ? er.msg : Lampa.Lang.translate('lampac_does_not_answer_text').replace('{balanser}', (balanser && sources[balanser] ? sources[balanser].name : balanser)));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };

    this.doesNotAnswer = function (er) {
      this.reset();
      const html = Lampa.Template.get('lampac_does_not_answer', { balanser: balanser });
      if (er && er.accsdb) html.find('.online-empty__title').html(er.msg);

      let tic = er && er.accsdb ? 10 : 5;
      html.find('.cancel').on('hover:enter', () => clearInterval(balanserTimer));
      html.find('.change').on('hover:enter', () => { clearInterval(balanserTimer); filter.render().find('.filter--sort').trigger('hover:enter'); });

      scroll.clear();
      scroll.append(html);
      this.loading(false);

      balanserTimer = setInterval(() => {
        tic--;
        html.find('.timeout').text(tic);
        if (tic === 0) {
          clearInterval(balanserTimer);
          const keys = Lampa.Arrays.getKeys(sources);
          const indx = keys.indexOf(balanser);
          let next = keys[indx + 1];
          if (!next) next = keys[0];
          balanser = next;
          if (Lampa.Activity.active().activity == this.activity) this.changeBalanser(balanser);
        }
      }, 1000);
    };

    this.getLastEpisode = function (items) {
      let last_episode = 0;
      items.forEach(e => { if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode)); });
      return last_episode;
    };

    // navigation controller
    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;
      if (!initialized) { initialized = true; this.initialize(); }
      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      Lampa.Controller.add('content', {
        toggle: function () { Lampa.Controller.collectionSet(scroll.render(), files.render()); Lampa.Controller.collectionFocus(last || false, scroll.render()); },
        gone: function () { clearTimeout(balanserTimer); },
        up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
        down: function () { Navigator.move('down'); },
        right: function () { if (Navigator.canmove('right')) Navigator.move('right'); else filter.show(Lampa.Lang.translate('title_filter'), 'filter'); },
        left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
        back: this.back.bind(this)
      });
      Lampa.Controller.toggle('content');
    };

    this.render = function () { return files.render(); };
    this.back = function () { Lampa.Activity.backward(); };
    this.pause = function () {};
    this.stop = function () {};
    this.destroy = function () {
      network.clear();
      this.clearImages();
      files.destroy();
      scroll.destroy();
      clearInterval(balanserTimer);
      clearTimeout(lifeWaitTimer);
    };
  } // end component

  // addSourceSearch helper (kept, slightly optimized)
  function addSourceSearch(spiderName, spiderUri) {
    const network = new Lampa.Reguest();
    const source = {
      title: spiderName,
      search: function (params, oncomplite) {
        function searchComplite(links) {
          const keys = Lampa.Arrays.getKeys(links);
          if (keys.length) {
            const status = new Lampa.Status(keys.length);
            status.onComplite = function (result) {
              const rows = [];
              keys.forEach(name => {
                const line = result[name];
                if (line && line.data && line.type === 'similar') {
                  const cards = line.data.map(item => {
                    item.title = Lampa.Utils.capitalizeFirstLetter(item.title);
                    item.release_date = item.year || '0000';
                    item.balanser = spiderUri;
                    if (item.img !== undefined) {
                      if (item.img.charAt(0) === '/') item.img = CONFIG.localhost + item.img.substring(1);
                      if (item.img.indexOf('/proxyimg') !== -1) item.img = account(item.img);
                    }
                    return item;
                  });
                  rows.push({ title: name, results: cards });
                }
              });
              oncomplite(rows);
            };
            keys.forEach(name => {
              network.silent(account(links[name]), data => status.append(name, data), () => status.error());
            });
          } else oncomplite([]);
        }

        network.silent(account(CONFIG.localhost + 'lite/' + spiderUri + '?title=' + params.query), function (json) {
          if (json.rch) {
            rchRun(json, function () {
              network.silent(account(CONFIG.localhost + 'lite/' + spiderUri + '?title=' + params.query), function (links) { searchComplite(links); }, function () { oncomplite([]); });
            });
          } else searchComplite(json);
        }, function () { oncomplite([]); });
      },
      onCancel: function () { network.clear(); },
      params: { lazy: true, align_left: true, card_events: { onMenu: function () {} } },
      onMore: function (params, close) { close(); },
      onSelect: function (params, close) {
        close();
        Lampa.Activity.push({
          url: params.element.url,
          title: 'Lampac - ' + params.element.title,
          component: 'bwarch',
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true
        });
      }
    };
    Lampa.Search.addSource(source);
  }

  // startPlugin: registers component, templates, translations, button etc.
  function startPlugin() {
    if (window.bwarch_plugin) return;
    window.bwarch_plugin = true;

    const manifest = {
      type: 'video',
      version: '1.6.4-optim',
      name: 'BwaRC',
      description: 'Плагин для просмотра онлайн сериалов и фильмов (оптимизированный)',
      component: 'bwarch',
      onContextMenu: (object) => ({ name: Lampa.Lang.translate('lampac_watch'), description: '' }),
      onContextLauch: (object) => {
        resetTemplates();
        Lampa.Component.add('bwarch', component);
        const id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title);
        const all = Lampa.Storage.get('clarification_search', {}) || {};
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'bwarch',
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
          clarification: !!all[id]
        });
      }
    };

    Lampa.Manifest.plugins = manifest;

    // translations (add Ukrainian 'Дивитись ТУТ' label usage below)
    Lampa.Lang.add({
      lampac_watch: { ru: 'Смотреть онлайн', en: 'Watch online', uk: 'Дивитися онлайн', zh: '在线观看' },
      lampac_video: { ru: 'Видео', en: 'Video', uk: 'Відео', zh: '视频' },
      lampac_no_watch_history: { ru: 'Нет истории просмотра', en: 'No browsing history', uk: 'Немає історії перегляду', zh: '没有浏览历史' },
      lampac_nolink: { ru: 'Не удалось извлечь ссылку', uk: 'Неможливо отримати посилання', en: 'Failed to fetch link', zh: '获取链接失败' },
      lampac_balanser: { ru: 'Источник', uk: 'Джерело', en: 'Source', zh: '来源' },
      helper_online_file: { ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню', uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню', en: 'Hold the "OK" key to bring up the context menu', zh: '按住“确定”键调出上下文菜单' },
      title_online: { ru: 'Онлайн', uk: 'Онлайн', en: 'Online', zh: '在线的' },
      lampac_voice_subscribe: { ru: 'Подписаться на перевод', uk: 'Підписатися на переклад', en: 'Subscribe to translation', zh: '订阅翻译' },
      lampac_voice_success: { ru: 'Вы успешно подписались', uk: 'Ви успішно підписалися', en: 'You have successfully subscribed', zh: '您已成功订阅' },
      lampac_voice_error: { ru: 'Возникла ошибка', uk: 'Виникла помилка', en: 'An error has occurred', zh: '发生了错误' },
      lampac_clear_all_marks: { ru: 'Очистить все метки', uk: 'Очистити всі мітки', en: 'Clear all labels', zh: '清除所有标签' },
      lampac_clear_all_timecodes: { ru: 'Очистить все тайм-коды', uk: 'Очистити всі тайм-коди', en: 'Clear all timecodes', zh: '清除所有时间代码' },
      lampac_change_balanser: { ru: 'Изменить балансер', uk: 'Змінити балансер', en: 'Change balancer', zh: '更改平衡器' },
      lampac_balanser_dont_work: { ru: 'Поиск не дал результатов', uk: 'Пошук не дав результатів', en: 'Search did not return any results', zh: '搜索 未返回任何结果' },
      lampac_balanser_timeout: { ru: 'Источник будет переключен автоматически через <span class="timeout">10</span> секунд.', uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.', en: 'The source will be switched automatically after <span class="timeout">10</span> seconds.', zh: '平衡器将在<span class="timeout">10</span>秒内自动切换。' },
      lampac_does_not_answer_text: { ru: 'Поиск не дал результатов', uk: 'Пошук не дав результатів', en: 'Search did not return any results', zh: '搜索 未返回任何结果' }
    });

    // styles & templates (kept but injected once)
    Lampa.Template.add('lampac_css', "\n        <style>\n        @charset 'UTF-8';/* minimal css kept */\n        .online-prestige{position:relative;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;flex-grow:1;position:relative}.online-prestige__img{position:relative;width:13em;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:.3em;opacity:0;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;background-size:contain}\n        </style>\n    ");
    $('body').append(Lampa.Template.get('lampac_css', {}, true));

    function resetTemplates() {
      Lampa.Template.add('lampac_prestige_full', "<div class=\"online-prestige online-prestige--full selector\"> <div class=\"online-prestige__img\"> <img alt=\"\"> <div class=\"online-prestige__loader\"></div> </div> <div class=\"online-prestige__body\"> <div class=\"online-prestige__head\"> <div class=\"online-prestige__title\">{title}</div> <div class=\"online-prestige__time\">{time}</div> </div> <div class=\"online-prestige__timeline\"></div> <div class=\"online-prestige__footer\"> <div class=\"online-prestige__info\">{info}</div> <div class=\"online-prestige__quality\">{quality}</div> </div> </div> </div>");
      Lampa.Template.add('lampac_content_loading', "<div class=\"online-empty\"><div class=\"broadcast__scan\"><div></div></div><div class=\"online-empty__templates\"><div class=\"online-empty-template selector\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div><div class=\"online-empty-template\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div><div class=\"online-empty-template\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div></div></div>");
      Lampa.Template.add('lampac_does_not_answer', "<div class=\"online-empty\"><div class=\"online-empty__title\">#{lampac_balanser_dont_work}</div><div class=\"online-empty__time\">#{lampac_balanser_timeout}</div><div class=\"online-empty__buttons\"><div class=\"online-empty__button selector cancel\">#{cancel}</div><div class=\"online-empty__button selector change\">#{lampac_change_balanser}</div></div><div class=\"online-empty__templates\"><div class=\"online-empty-template\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div><div class=\"online-empty-template\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div><div class=\"online-empty-template\"><div class=\"online-empty-template__ico\"></div><div class=\"online-empty-template__body\"></div></div></div></div>");
      Lampa.Template.add('lampac_prestige_rate', "<div class=\"online-prestige-rate\"><svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z\" fill=\"#fff\"></path></svg><span>{rate}</span></div>");
      Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige online-prestige--folder selector\"><div class=\"online-prestige__folder\"><svg viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"></rect><path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"></path><rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"></rect></svg></div><div class=\"online-prestige__body\"><div class=\"online-prestige__head\"><div class=\"online-prestige__title\">{title}</div><div class=\"online-prestige__time\">{time}</div></div><div class=\"online-prestige__footer\"><div class=\"online-prestige__info\">{info}</div></div></div></div>");
      Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\"><div class=\"online-prestige-watched__icon\"><svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/><path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/></svg></div><div class=\"online-prestige-watched__body\"></div></div>");
    }

    Lampa.Component.add('bwarch', component);
    resetTemplates();

    // button HTML with Ukrainian label "Дивитись ТУТ"
    const button = `<div class="full-start__button selector view--online lampac--button" data-subtitle="${manifest.name} v${manifest.version}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 392.697 392.697"><path d="M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18C19.784,81.593,20.584,82.847,21.837,83.419z" fill="currentColor"/><path d="M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945V180.445C187.735,179.076,186.936,177.831,185.689,177.261z" fill="currentColor"/></svg><span>Дивитись ТУТ</span></div>`;

    // Add button into full view items when available
    function addButton(e) {
      if (!e.render || e.render.find('.lampac--button').length) return;
      const btn = $(button);
      btn.on('hover:enter', function () {
        resetTemplates();
        Lampa.Component.add('bwarch', component);
        const id = Lampa.Utils.hash(e.movie.number_of_seasons ? e.movie.original_name : e.movie.original_title);
        const all = Lampa.Storage.get('clarification_search', {}) || {};
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'bwarch',
          search: all[id] ? all[id] : e.movie.title,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1,
          clarification: !!all[id]
        });
      });
      e.render.after(btn);
    }

    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'complite') {
        addButton({ render: e.object.activity.render().find('.view--torrent'), movie: e.data.movie });
      }
    });

    try {
      if (Lampa.Activity.active().component === 'full') {
        addButton({ render: Lampa.Activity.active().activity.render().find('.view--torrent'), movie: Lampa.Activity.active().card });
      }
    } catch (e) {}

    // ensure storage sync for common balancers
    if (Lampa.Manifest.app_digital >= 177) {
      CONFIG.onlineChoiceSyncList.forEach(function (name) { Lampa.Storage.sync('online_choice_' + name, 'object_object'); });
      Lampa.Storage.sync('online_watched_last', 'object_object');
    }
  } // end startPlugin

  startPlugin();

})();
