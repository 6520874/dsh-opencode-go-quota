window.__ModuleLoader__.load({
  id: 'dsh-opencode-go-quota',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var reactDom = require('react-dom')
    var primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    var h = react.createElement
    var useAnchoredPosition =
      primitives !== null && primitives !== undefined && typeof primitives.useAnchoredPosition === 'function'
        ? primitives.useAnchoredPosition
        : function () {
            return null
          }
    var useDismissOnOutsidePointer =
      primitives !== null && primitives !== undefined && typeof primitives.useDismissOnOutsidePointer === 'function'
        ? primitives.useDismissOnOutsidePointer
        : function () {}

    var PACKAGE_NAME = 'dsh-opencode-go-quota'
    var NS = 'opencode-go-quota'
    var SERVICE = 'opencodeGoQuota'
    var SLOT = 'conversation.composer.dock'
    var WINDOW_KEYS = ['rolling', 'weekly', 'monthly']
    var POLL_MS = 60_000

    /* ---------------- result codec (same shape as the host half) ---------------- */

    function clampPercent(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
      return Math.min(100, Math.max(0, value))
    }

    function parseWindow(row) {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid quota window')
      if (row.status !== 'ok' && row.status !== 'rate-limited') throw new Error('Invalid quota window status')
      var used = clampPercent(row.usedPercent)
      var remaining = clampPercent(row.remainingPercent)
      if (used === undefined || remaining === undefined) throw new Error('Invalid quota window percentage')
      if (typeof row.resetsAt !== 'string' || !Number.isFinite(Date.parse(row.resetsAt))) throw new Error('Invalid quota reset time')
      return { status: row.status, usedPercent: used, remainingPercent: remaining, resetsAt: row.resetsAt }
    }

    function parseQuotaSnapshot(value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid quota snapshot')
      if (typeof value.fetchedAt !== 'number' || !Number.isSafeInteger(value.fetchedAt) || value.fetchedAt < 0) throw new Error('Invalid quota timestamp')
      if (value.windows === null || typeof value.windows !== 'object' || Array.isArray(value.windows)) throw new Error('Invalid quota windows')
      var windows = {}
      for (var i = 0; i < WINDOW_KEYS.length; i += 1) windows[WINDOW_KEYS[i]] = parseWindow(value.windows[WINDOW_KEYS[i]])
      return {
        fetchedAt: value.fetchedAt,
        windows: windows,
        ...(typeof value.source === 'string' ? { source: value.source } : {}),
        ...(value.stale === true ? { stale: true } : {}),
        ...(typeof value.error === 'string' ? { error: value.error } : {})
      }
    }

    var resultCodec = {
      mode: 'strict',
      typeSymbol: PACKAGE_NAME + '#QuotaSnapshot',
      schema: { parse: parseQuotaSnapshot },
      create: function () {
        return { parse: parseQuotaSnapshot }
      }
    }

    var quotaRemote = {
      package: PACKAGE_NAME,
      descriptors: [
        {
          id: PACKAGE_NAME + '#' + SERVICE + '/read',
          service: SERVICE,
          namespace: SERVICE,
          method: 'read',
          invocation: { kind: 'direct' },
          parameters: [],
          result: resultCodec
        }
      ]
    }

    /* ---------------- copy ---------------- */

    var zh = {
      brand: 'Go',
      'window.rolling': '5h',
      'window.weekly': '周',
      'window.monthly': '月',
      'window.long.rolling': '5 小时',
      'window.long.weekly': '本周',
      'window.long.monthly': '本月',
      aria: 'OpenCode Go 剩余额度：5 小时 {rolling}%，本周 {weekly}%，本月 {monthly}%',
      'panel.title': 'OpenCode Go 剩余额度',
      'panel.reset': '重置于 {time}',
      'panel.limited': '限流中',
      'panel.updated': '更新于 {time}',
      'panel.refresh': '刷新',
      'panel.refreshing': '刷新中…',
      'panel.stale': '数据未刷新',
      unavailable: '额度不可用',
      'reason.missing-credential': '未配置 Key',
      'reason.unauthorized': 'Key 无效',
      'reason.network': '网络不可达',
      'reason.invalid-response': '响应异常',
      'reason.http': '接口错误',
      'reason.unknown': '未知错误'
    }

    var en = {
      brand: 'Go',
      'window.rolling': '5h',
      'window.weekly': 'wk',
      'window.monthly': 'mo',
      'window.long.rolling': '5-hour window',
      'window.long.weekly': 'this week',
      'window.long.monthly': 'this month',
      aria: 'OpenCode Go quota remaining: {rolling}% for the 5-hour window, {weekly}% this week, {monthly}% this month',
      'panel.title': 'OpenCode Go quota',
      'panel.reset': 'Resets {time}',
      'panel.limited': 'Rate limited',
      'panel.updated': 'Updated {time}',
      'panel.refresh': 'Refresh',
      'panel.refreshing': 'Refreshing…',
      'panel.stale': 'Not refreshed',
      unavailable: 'quota unavailable',
      'reason.missing-credential': 'no API key',
      'reason.unauthorized': 'invalid key',
      'reason.network': 'network error',
      'reason.invalid-response': 'bad response',
      'reason.http': 'endpoint error',
      'reason.unknown': 'unknown error'
    }

    function interpolate(template, params) {
      return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, function (_, key) {
        return params[key] === undefined ? '' : String(params[key])
      })
    }

    var cssId = PACKAGE_NAME + '/ComposerQuotaPill.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(cssId) + ']') === null) {
      var style = document.createElement('style')
      style.dataset.plugin = PACKAGE_NAME
      style.dataset.pluginCss = cssId
      style.textContent =
        '.dq-anchor{order:1;min-width:0;max-width:100%;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));display:inline-flex;align-items:center;flex:0 1 auto}' +
        '.dq-pill{box-sizing:border-box;border-radius:var(--dsw-radius-sm);min-width:0;max-width:100%;overflow:hidden;color:var(--dsw-alias-label-tertiary);font:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;background:0 0;border:none;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;cursor:pointer}' +
        '.dq-pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}' +
        '.dq-pill[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}' +
        '.dq-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}' +
        '.dq-dot{flex:none;width:6px;height:6px;border-radius:50%;background:#39a878}' +
        '.dq-dot[data-level="warn"]{background:#d9a441}' +
        '.dq-dot[data-level="low"]{background:#e5484d}' +
        '.dq-brand{flex:none;color:var(--dsw-alias-label-tertiary);font-weight:500}' +
        '.dq-content{display:block;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.dq-window{display:inline;white-space:nowrap}' +
        '.dq-label{color:var(--dsw-alias-label-tertiary)}' +
        '.dq-value{margin-left:4px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}' +
        '.dq-value[data-level="warn"]{color:#d9a441}' +
        '.dq-value[data-level="low"]{color:#e5484d}' +
        '.dq-sep{color:var(--dsw-alias-separator-primary);margin:0 6px}' +
        '.dq-stale{flex:none;color:#d9a441;font-weight:600}' +
        '.dq-error{color:var(--dsw-alias-label-error)}' +
        '.dq-panel{position:fixed;z-index:1100;box-sizing:border-box;width:min(288px,100vw - 24px);max-width:var(--dsh-anchored-max-width,288px);max-height:var(--dsh-anchored-max-height,none);overflow:hidden auto;border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;border:0;padding:12px;font-size:12px;line-height:20px;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}' +
        '.dq-panel-head{display:flex;align-items:center;gap:8px}' +
        '.dq-panel-title{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-weight:500}' +
        '.dq-panel-refresh{font:inherit;flex:none;cursor:pointer;background:none;border:0;padding:0;color:var(--dsw-alias-brand-primary)}' +
        '.dq-panel-refresh:hover:not(:disabled){text-decoration:underline}' +
        '.dq-panel-refresh:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}' +
        '.dq-panel-refresh:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:3px}' +
        '.dq-panel-window{display:flex;flex-direction:column;gap:5px;margin-top:10px}' +
        '.dq-panel-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}' +
        '.dq-panel-label{color:var(--dsw-alias-label-secondary)}' +
        '.dq-panel-percent{color:var(--dsw-alias-label-primary);font-weight:500;font-variant-numeric:tabular-nums}' +
        '.dq-panel-percent[data-level="warn"]{color:#d9a441}' +
        '.dq-panel-percent[data-level="low"]{color:#e5484d}' +
        '.dq-panel-track{height:4px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden}' +
        '.dq-panel-fill{height:100%;border-radius:1px;background:#39a878}' +
        '.dq-panel-fill[data-level="warn"]{background:#d9a441}' +
        '.dq-panel-fill[data-level="low"]{background:#e5484d}' +
        '.dq-panel-reset{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}' +
        '.dq-panel-limited{color:var(--dsw-alias-label-error);font-size:11px;line-height:16px}' +
        '.dq-panel-foot{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-top:1px solid var(--dsw-alias-border-l2);margin-top:12px;padding-top:8px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}' +
        '.dq-panel-foot .dq-stale{flex:none}' +
        '@media (width<=720px){.dq-brand{display:none}}'
      document.head.appendChild(style)
    }

    function levelOf(remaining) {
      if (remaining <= 10) return 'low'
      if (remaining <= 35) return 'warn'
      return 'ok'
    }

    function localeTag() {
      try {
        var active = getLocale()
        if (typeof active === 'string' && active !== '' && active.indexOf('zh') === 0) return 'zh-CN'
        if (typeof active === 'string' && active !== '') return active
      } catch {
        // Fall through to the document language.
      }
      return typeof document !== 'undefined' && document.documentElement.lang !== '' ? document.documentElement.lang : undefined
    }

    function formatReset(iso, tag) {
      var time = Date.parse(iso)
      if (!Number.isFinite(time)) return iso
      try {
        return new Date(time).toLocaleString(tag, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return new Date(time).toLocaleString()
      }
    }

    function reasonText(t, error) {
      var reason = error && typeof error === 'object' && error.details && typeof error.details === 'object' ? error.details.reason : undefined
      if (typeof reason === 'string' && t('reason.' + reason) !== 'reason.' + reason) return t('reason.' + reason)
      return t('reason.unknown')
    }

    function QuotaPill(props) {
      var t = props.t
      var getLocale = props.getLocale
      var read = props.read

      var mounted = react.useRef(true)
      var busy = react.useRef(false)
      var anchorRef = react.useRef(null)
      var panelRef = react.useRef(null)
      var stateTuple = react.useState({ phase: 'loading', data: null, error: null, refreshing: true })
      var state = stateTuple[0]
      var setState = stateTuple[1]
      var openTuple = react.useState(false)
      var open = openTuple[0]
      var setOpen = openTuple[1]
      var compactTuple = react.useState(false)
      var compact = compactTuple[0]
      var setCompact = compactTuple[1]
      // The anchor only exists once there is something to render (or a failure
      // pill); track that so the resize observer re-attaches after mount.
      var hasAnchor = state.data !== null || state.phase === 'failed'

      var refresh = react.useCallback(
        function () {
          if (busy.current) return
          busy.current = true
          setState(function (previous) {
            return { phase: previous.data === null ? 'loading' : 'ready', data: previous.data, error: previous.error, refreshing: true }
          })
          read().then(
            function (data) {
              busy.current = false
              if (!mounted.current) return
              setState({ phase: 'ready', data: data, error: null, refreshing: false })
            },
            function (error) {
              busy.current = false
              if (!mounted.current) return
              setState(function (previous) {
                return { phase: previous.data === null ? 'failed' : 'ready', data: previous.data, error: error, refreshing: false }
              })
            }
          )
        },
        [read]
      )

      var refreshFromPanel = react.useCallback(
        function (event) {
          if (event !== undefined) {
            event.preventDefault()
            event.stopPropagation()
          }
          refresh()
        },
        [refresh]
      )

      var toggle = react.useCallback(function (event) {
        if (event !== undefined) {
          event.preventDefault()
          event.stopPropagation()
        }
        setOpen(function (value) {
          return !value
        })
      }, [])

      react.useEffect(function () {
        mounted.current = true
        var timer = null
        var start = function () {
          if (timer !== null) return
          timer = setInterval(refresh, POLL_MS)
        }
        var stop = function () {
          if (timer === null) return
          clearInterval(timer)
          timer = null
        }
        refresh()
        if (typeof document === 'undefined' || document.visibilityState === 'visible') start()
        var onVisibility = function () {
          if (typeof document === 'undefined') return
          if (document.visibilityState === 'visible') {
            start()
            refresh()
          } else {
            stop()
          }
        }
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
        return function () {
          mounted.current = false
          stop()
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [refresh])

      react.useEffect(function () {
        var element = anchorRef.current
        if (element === null || typeof ResizeObserver !== 'function') return
        var observer = new ResizeObserver(function (entries) {
          var width = entries[0].contentRect.width
          setCompact(function (current) {
            if (!current && width < 170) return true
            if (current && width >= 190) return false
            return current
          })
        })
        observer.observe(element)
        return function () {
          observer.disconnect()
        }
      }, [hasAnchor])

      var data = state.data
      var tag = localeTag()
      var panelOpen = open && data !== null

      var position = useAnchoredPosition({
        open: panelOpen,
        anchorRef: anchorRef,
        panelRef: panelRef,
        side: 'top',
        align: 'end',
        gap: 8,
        margin: 12
      })
      useDismissOnOutsidePointer(anchorRef, panelOpen, setOpen, panelRef)

      react.useEffect(function () {
        if (!panelOpen) return
        var onKeyDown = function (event) {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return function () {
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [panelOpen])

      react.useEffect(function () {
        if (open && data === null) setOpen(false)
      }, [open, data])

      // Nothing to show yet: stay quiet instead of flashing a placeholder next to
      // the official session statistics.
      if (data === null && state.phase === 'loading') return null

      if (state.phase === 'failed') {
        var failTitle = t('unavailable') + ' · ' + reasonText(t, state.error)
        if (state.error !== null && typeof state.error === 'object' && typeof state.error.message === 'string') failTitle = failTitle + '\n' + state.error.message
        return h(
          'span',
          { className: 'dq-anchor' },
          h(
            'button',
            {
              type: 'button',
              className: 'dq-pill',
              title: failTitle,
              'aria-label': failTitle,
              onClick: refreshFromPanel
            },
            h('span', { className: 'dq-dot', 'data-level': 'low', 'aria-hidden': 'true' }),
            h('span', { className: 'dq-error' }, t('unavailable'))
          )
        )
      }

      var windows = data.windows
      var dotLevel = levelOf(windows.rolling.remainingPercent)
      if (data.stale === true) dotLevel = 'warn'

      var contentChildren = []
      for (var index = 0; index < WINDOW_KEYS.length; index += 1) {
        var key = WINDOW_KEYS[index]
        var row = windows[key]
        if (index > 0) contentChildren.push(h('span', { className: 'dq-sep', key: 'sep-' + key, 'aria-hidden': 'true' }, '·'))
        contentChildren.push(
          h(
            'span',
            { className: 'dq-window', key: key },
            h('span', { className: 'dq-label' }, t('window.' + key)),
            h('span', { className: 'dq-value', 'data-level': levelOf(row.remainingPercent) }, Math.round(row.remainingPercent) + '%')
          )
        )
      }
      var pillChildren = [h('span', { className: 'dq-dot', 'data-level': dotLevel, 'aria-hidden': 'true' })]
      if (!compact) pillChildren.push(h('span', { className: 'dq-brand' }, t('brand')))
      pillChildren.push(h('span', { className: 'dq-content' }, contentChildren))
      if (data.stale === true) {
        pillChildren.push(h('span', { className: 'dq-stale', key: 'stale', title: t('panel.stale'), 'aria-hidden': 'true' }, '!'))
      }

      var aria = interpolate(t('aria'), {
        rolling: Math.round(windows.rolling.remainingPercent),
        weekly: Math.round(windows.weekly.remainingPercent),
        monthly: Math.round(windows.monthly.remainingPercent)
      })

      var panel = null
      if (panelOpen) {
        var panelChildren = [
          h(
            'div',
            { className: 'dq-panel-head', key: 'head' },
            h('span', { className: 'dq-panel-title' }, t('panel.title')),
            h(
              'button',
              {
                type: 'button',
                className: 'dq-panel-refresh',
                disabled: state.refreshing,
                onClick: refreshFromPanel
              },
              state.refreshing ? t('panel.refreshing') : t('panel.refresh')
            )
          )
        ]
        for (var panelIndex = 0; panelIndex < WINDOW_KEYS.length; panelIndex += 1) {
          var panelKey = WINDOW_KEYS[panelIndex]
          var panelRow = windows[panelKey]
          var percent = Math.round(panelRow.remainingPercent)
          var level = levelOf(panelRow.remainingPercent)
          var windowLabel = t('window.long.' + panelKey)
          panelChildren.push(
            h(
              'div',
              { className: 'dq-panel-window', key: panelKey },
              h(
                'div',
                { className: 'dq-panel-row' },
                h('span', { className: 'dq-panel-label' }, windowLabel),
                h('span', { className: 'dq-panel-percent', 'data-level': level }, percent + '%')
              ),
              h(
                'div',
                {
                  className: 'dq-panel-track',
                  role: 'progressbar',
                  'aria-label': windowLabel,
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                  'aria-valuenow': percent
                },
                h('div', { className: 'dq-panel-fill', 'data-level': level, style: { width: percent + '%' } })
              ),
              h('div', { className: 'dq-panel-reset' }, interpolate(t('panel.reset'), { time: formatReset(panelRow.resetsAt, tag) })),
              panelRow.status === 'rate-limited' ? h('div', { className: 'dq-panel-limited' }, t('panel.limited')) : null
            )
          )
        }
        panelChildren.push(
          h(
            'div',
            { className: 'dq-panel-foot', key: 'foot' },
            h(
              'span',
              null,
              interpolate(t('panel.updated'), {
                time: new Date(data.fetchedAt).toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              })
            ),
            data.stale === true ? h('span', { className: 'dq-stale' }, t('panel.stale')) : null
          )
        )
        panel = reactDom.createPortal(
          h(
            'div',
            {
              ref: panelRef,
              className: 'dq-panel',
              role: 'dialog',
              'aria-label': t('panel.title'),
              style: position === null ? { visibility: 'hidden', left: 0, top: 0 } : position
            },
            panelChildren
          ),
          document.body
        )
      }

      return h(
        'span',
        { className: 'dq-anchor', ref: anchorRef, 'data-compact': compact ? 'true' : undefined },
        h(
          'button',
          {
            type: 'button',
            className: 'dq-pill',
            'aria-label': aria,
            'aria-haspopup': 'dialog',
            'aria-expanded': panelOpen,
            onClick: toggle
          },
          pillChildren
        ),
        panel
      )
    }

    /* ---------------- plugin ---------------- */

    var translate = function (key) {
      return key
    }
    var getLocale = function () {
      return undefined
    }

    var inject = ['slots', 'locale', 'remote']

    function apply(ctx) {
      ctx.effect(
        function () {
          return ctx.locale.register(NS, { zh: zh, en: en })
        },
        'opencode-go-quota: copy dictionaries'
      )

      var bound = ctx.locale.bind(NS)
      translate = function (key) {
        var value = bound(key)
        return typeof value === 'string' && value !== '' ? value : key
      }
      getLocale = function () {
        return ctx.locale.getLocale().active
      }

      var mountedRemote = ctx.remote.$mount(quotaRemote)
      ctx.effect(
        function () {
          Promise.resolve(mountedRemote).catch(function (error) {
            console.error('opencode-go-quota: could not mount the Remote contribution', error)
          })
        },
        'opencode-go-quota: mount Remote contribution'
      )

      ctx.inject(['remote.opencodeGoQuota'], function (ready) {
        var read = async function () {
          var result = await ready.remote.opencodeGoQuota.read()
          if (!result.ok) throw result.error
          return result.value
        }
        ready.slots.inject(SLOT, function () {
          return ready.slots.register(
            {
              name: SLOT,
              id: 'opencode-go-quota',
              order: 100,
              locale: NS,
              inject: function () {
                return { read: read, t: translate, getLocale: getLocale }
              }
            },
            QuotaPill
          )
        })
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
