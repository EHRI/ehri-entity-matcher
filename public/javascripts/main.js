
const HTTPS = window.location.host !== "localhost:9000"; // HACK!

const COLS = ["id", "name", "country", "lat", "lng"];

let app = new Vue({
  el: '#app',
  data: {
    data: "",
    type: "Place",
    results: [],
    selected: [],
    columns: COLS.slice(),
    loading: false,
    progress: 0
  },
  computed: {
    csv: function() {
      let text = "";
      this.results.forEach((r, i) => {
        let [input, matches] = r;
        let values = [];
        if (matches.length > 0 && matches[this.selected[i]]) {
          let match = matches[this.selected[i]];
          COLS.forEach(col => {
            if (this.columns.includes(col)) {
              values.push(match[col] ? match[col] : "");
            }
          });
        } else {
          COLS.forEach(col => {
            if (this.columns.includes(col)) {
              values.push("");
            }
          });
        }
        text += values.join(",") + "\n";
      });
      return text;
    },
    entities: function() {
      return this.data.trim().split("\n").filter(e => e.trim() !== "");
    },
    hasMatches: function() {
      return this.results.find(r => r[1].length > 0);
    }
  },
  methods: {
    find: function () {
      this.loading = true;
      let socketUrl = jsRoutes.controllers.HomeController.findWS(this.type).webSocketURL(HTTPS);
      let socket = new WebSocket(socketUrl);
      this.results = [];
      this.selected = [];
      this.progress = 0;
      socket.addEventListener('open', e => {
        socket.send(this.data);
      });
      socket.addEventListener("message", e => {
        let data = JSON.parse(e.data);
        console.log("Data: ", data)
        this.results.push(data);
        if (data[1]) {
          this.selected[this.results.length - 1] = 0;
        }
        this.progress = (100 / this.entities.length) * this.results.length;
        if (this.results.length === this.entities.length) {
          this.loading = false;
          socket.close();
        }
      });
      socket.addEventListener("close", e => {
        console.log("Closed socket...");
      });
    },
    selectResult: function(idx, ridx) {
      if (this.isSelected(idx, ridx)) {
        this.selected.splice(idx, 1);
      } else {
        this.selected.splice(idx, 1, ridx);
      }
    },
    clearResult: function(idx) {
      let [input, _] = this.results[idx];
      this.results.splice(idx, 1, [input, []]);
      this.selected.splice(idx, 1);
    },
    isSelected: function(idx, ridx) {
      return this.selected[idx] === ridx;
    },
    copyCsv: function() {
      let elem = document.getElementById("output-data");
      elem.select();
      document.execCommand("copy");
    }
  },
  template: `
    <div id="subject-matcher">
      <div class="field">
        <textarea class="textarea" rows="5" v-model="data" placeholder="List entities one per line"></textarea>
      </div>
      <div class="field" v-bind:disabled="data.trim() === ''">
        <label class="radio">
          <input type="radio" name="answer" value="Place" v-model="type">
          Places
        </label>
        <label class="radio">
          <input type="radio" name="answer" value="Person" v-model="type">
          People
        </label>
        <label class="radio">
          <input type="radio" name="answer" value="CorporateBody" v-model="type">
          Corporate Bodies
        </label>
      </div>
      <div class="field">
        <button class="button is-primary" 
            v-bind:disabled="data.trim() === ''" v-on:click="find"
            v-bind:class="{'is-loading': loading}">Find Matches</button>
      </div> 
      <hr/>
      <progress class="progress is-info" v-bind:value="progress" max="100"></progress>
      
      <div class="box" v-for="([input, matches], idx) in results">
        <h3 class="title is-4">Input: &quot;{{input}}&quot;</h3>
        <table class="table is-fullwidth is-bordered is-hoverable" v-if="matches.length > 0" id="results">
          <thead>
            <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>Alt. Names</th>
                <th>Country</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>
                    <span class="tag" v-on:click="clearResult(idx)">
                     Clear
                     <button class="delete is-small"></button>
                    </span>
                </th>
            </tr>
          </thead>
          <tbody v-if="matches.length > 0">
            <tr v-for="(result, ridx) in matches" v-on:click="selectResult(idx, ridx)">
               <td>{{result.id}}</td>
               <td>{{result.type}}</td>
               <td>{{result.name}}</td>
               <td>{{result.alternateNames ? result.alternateNames.slice(0, 4).join(", ") : ""}}</td>
               <td>{{result.country}}</td>
               <td>{{result.lat}}</td>
               <td>{{result.lng}}</td>
               <td>
                <a class="button" v-bind:class="{'is-success': selected[idx] === ridx}">
                    <span class="icon is-small">
                        <i class="fa fa-check"></i>
                    </span>
                    <span>Select</span>
                </a>
               </td>
            </tr>
          </tbody>
        </table>
        <span v-else>No Matches</span>
      </div>
      
      <div v-show="hasMatches">
        <hr/>
        <h2 class="subtitle is-3">Output Data</h2>
        <div class="field">
          Columns:
          <label class="checkbox">
            <input type="checkbox" value="id" v-model="columns">
            ID 
          </label> 
          <label class="checkbox">
            <input type="checkbox" value="name" v-model="columns">
            Name
          </label> 
          <label class="checkbox">
            <input type="checkbox" value="country" v-model="columns">
            Country
          </label> 
          <label class="checkbox">
            <input type="checkbox" value="lat" v-model="columns">
            Latitude
          </label> 
          <label class="checkbox">
            <input type="checkbox" value="lng" v-model="columns">
            Longitude       
          </label> 
        </div>
        <textarea class="textarea" v-bind:rows="results.length" 
            readonly id="output-data" v-on:click="copyCsv">{{csv}}</textarea>
      </div>
    </div>
  `
});