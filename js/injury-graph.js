"use strict"

/*
Notes:
 - Change Plotly Settings: "/js/assets/plotly-settings"
 - Function createTraces: "/js/create-traces.js"
 */

var injugyGraphPromise = Promise.all([
  Vue.http.get('/js/assets/injury-lookup.json'),
  Vue.http.get('/js/assets/plotly-settings.json')
]).then( values => {

  const injuryLookup = values[0].body
  const settings = values[1].body

  Vue.component('injury-graph', {
    template: `
    <div id="graph"></div>
    `,
    data: function() {
      return {
        layout: settings.layout,
        options: settings.options,
        traces: [],
        title: undefined
      }
    },
    methods: {
      default() {
        Plotly.react('graph', [], this.layout, this.options)
      },
      graph(payload) {
        this.layout.title.text = payload.name
        this.traces = createTraces(payload.injuries, injuryLookup, settings)
        Plotly.react('graph', this.traces, this.layout, this.options)
      }
    }
  })
})

// trace creation helper
function createTraces(injuries, injuryLookup, settings) {
  let traces = []
  let byLocation = {}
  let injuriesUnlisted = []

  const accumulate = (obj, key, value) => {
    if (Object.keys(obj).includes(key)) {
      obj[key].push(value)
    } else {
      obj[key] = [value]
    }
  }

  for (let injury of injuries) {
    let injuryName = injury.injury.toLowerCase()
    let found = false
    for (let location of Object.keys(injuryLookup)) {
      if (injuryName.includes(location)) {
        if (!Array.isArray(injuryLookup[location])) {
          if (injuryName.includes('right')) {
            let xyStr = injuryLookup[location].r.join(' ')
            accumulate(byLocation, xyStr, injuryName)
          } else if (injuryName.includes('left')) {
            let xyStr = injuryLookup[location].l.join(' ')
            accumulate(byLocation, xyStr, injuryName)
          } else {
            injuriesUnlisted.push(injuryName)
          }
        } else {
          let xyStr = injuryLookup[location].join(' ')
          accumulate(byLocation, xyStr, injuryName)
        }
        found = true
        break
      }
    }
    if (!found) {
      injuriesUnlisted.push(injuryName)
    }
  }

  const copy = (obj) => {
    return JSON.parse(JSON.stringify(obj))
  }

  for (let [locKey, injuries] of Object.entries(byLocation)) {
    let coord = locKey.split(' ')
    if (locKey.includes('-')) {
      var x = [-.5, parseFloat(coord[0])]
      var textPos = "center left"
    } else {
      var x = [.5, parseFloat(coord[0])]
      var textPos = "center right"
    }
    var y = [parseFloat(coord[1]), parseFloat(coord[1])]
    let trace = copy(settings['trace-base'])
    trace.x = x
    trace.y = y
    trace.text = [
        '<span style="font-size: 16px;">'
        + '<br>'.repeat(injuries.length-1)
        + injuries.join('<br>')
      + '</span>'
    ]
    trace.textposition = textPos
    trace.line.color = 'rgb(255, 204, 0)'
    traces.push(trace)
  }

  if (injuriesUnlisted.length != 0) {
    let traceUnlisted = copy(settings['trace-extra'])
    traceUnlisted.text = [
        '<span style="font-weight: bold; font-size: 1.5em;">'
        + '<span style="color: rgb(150, 150, 0);">&#9888;</span> '
        + 'Vague Injuries:'
      + '</span><br><br>'
      + injuriesUnlisted.map(x => '<span style="font-size: 16px;">' + x + '</span>').join('<br>')
    ]
    traces.push(traceUnlisted)
  }

  if (traces.length === 0) {
    let traceUninjured = copy(settings['trace-extra'])
    traceUninjured.text = [
        '<span style="font-weight: bold; font-size: 2em;">'
        + '<span style="color: green;">&#10003;</span> '
        + 'No Injuries'
      + '</span>'
    ]
    traces.push(traceUninjured)
  }

  return traces

}
