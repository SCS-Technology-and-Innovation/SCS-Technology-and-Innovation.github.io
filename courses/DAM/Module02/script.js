// JavaScript
var canvas = document.getElementById('draw');
var ctx = canvas.getContext('2d');
ctx.textAlign = 'center';
const tc = '#ffffff'; // text color 
let wt = document.getElementById("workerstats");
let ct = document.getElementById("clientstats");

let workers = null;
let loungechairs = null;

let scount = 1;

TAKEN = '#990033';
BUSY = '#993333';
FREE = '#336633';
IDLE = '#336666';

const MARGIN = 15;
let radius = null;
let unit = null;
let BOTTOM = null;

let available = null;
let pending = null;
let wait = null;

function tickWorkers() {
    for (const c of workers) {
	if (!!c.occupant) { // serving a client
	    if (Math.random() < servicerate) {
		console.log('Coiffeur', c.label, 'finished serving client', c.occupant.label);
		c.occupant = null;
		c.served++;
		c.duration = 0; // reset
		satisfied++;
		available.push(c.label); // go wait for a client
		console.log('Coiffeur', c.label, 'is now available');
	    } else {
		c.duration++; // progress
		c.busy++; // working
	    }
	   
	} else {
	    c.idle++; // not working
	}
    }
    console.log('Availability', available);
}

let impatient = 0;
let rejected = 0;
let satisfied = 0;

function randint(low, high) { 
    let span = high + 1 - low;
    return Math.min(Math.floor(low + span * Math.random()), high);
}

function tickLounge() {
    let discard = []; // keep track of people who free their chairs
    for (const c of pending) { // for each pending client (FCFS)
	if (c.waited > maxwait) {
	    impatient++; // the client will leave
	    let s = loungechairs.indexOf(c.seat);
	    console.log('Client', c.label, 'in seat', s, 'gave up and left');
	    c.seat = null; // no longer seated in the lounge
	    loungechairs[s].occupant = null; // release the seat
	    discard.push(c);
	} else {
	    let chosen = null;
	    if (keep && preference.hasOwnProperty(c.label)) { // has a preference
		let p = preference[c.label];
		console.log('Client', c.label, 'wants coiffeur', p);		
		let i = available.indexOf(p);
		if (i > -1) { // the preference is available
		    available.splice(i, 1); // assign to this client
		    chosen = workers[p];
		    console.log('Coiffeur', p, 'is available');
		} else {
		    console.log('Coiffeur', p, 'is busy');
		}		
	    } else { // no preference
		console.log('Client', c.label, 'has no preference');		
		if (available.length > 0) { // idle coiffeurs
		    if (ordered) {
			chosen = workers[available.pop(0)]; // FIFO
			console.log('Coiffeur', chosen.label, 'is up next');
		    } else {
			console.log(available);
			let r = randint(0, available.length - 1);
			console.log('Picked position', r, 'from', available.length);
			chosen = workers[available[r]];
			console.log('Coiffeur', chosen.label, 'was picked at random');
			available.splice(r, 1); // assign to this client
			console.log(available);			
		    }
		}
	    }
	    if (chosen != null) {
		wait.push(c.waited); // record waiting time
		let s = loungechairs.indexOf(c.seat); // where did they sit
		console.log('Client', c.label, 'in seat', s, 'is now getting served by coiffeur', chosen.label);		
		loungechairs[s].occupant = null; // release the seat
		chosen.occupant = c;
		if (!preference.hasOwnProperty(c.label)) { // there was no preference set yet for this client
		    preference[c.label] = chosen.label; // becomes a regular
		}
		discard.push(c);
	    } else { // not getting served
		c.waited++;
		console.log('Client', c.label, 'needs to wait');
	    }
	}
    }
    for (const c of discard) {
	let i = pending.indexOf(c);
	if (i > -1) {
	    console.log('Client', c.label, 'is no longer waiting for service');
	    pending.splice(i, 1); // no longer pending
	}
    }
}

function setup() {
    let w = 0.7 * window.innerWidth;
    let n = parseInt(document.getElementById('workers').value);
    workers = [];
    available = [];
    unit = Math.floor(w / n) - 2 * MARGIN;
    for (let i = 0; i < n; i++) {
	let w = {};
	w.occupant = null;
	w.idle = 0;
	w.busy = 0;
	w.duration = 0;
	w.served = 0;
	w.label = i;
	workers.push(w);
	available.push(w.label);
    }
    console.log('Availability', available);
    people = (n + 1) * MARGIN + n * unit;

    n = parseInt(document.getElementById('lounge').value);
    loungechairs = []; 
    unit = Math.min(unit, 2 * Math.floor(w / (2 * n)) - MARGIN);
    for (let i = 0; i < n; i++) {
	let c = {};
	c.occupant = null;
	c.label = i + 1;
	loungechairs.push(c);
    }
    radius = Math.floor(unit / 2);
    chairs = (n + 1) * MARGIN + n * 2 * radius; 

    fs = Math.ceil(unit / 5);
    
    canvas.height = 3 * MARGIN + 2 * unit;
    BOTTOM = canvas.height - radius - MARGIN;
    canvas.width = Math.max(people, chairs);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLounge();
    drawWorkers();
}

function drawLounge() {
    let x = radius + MARGIN;
    for (const c of loungechairs) {
	let color = FREE;
	if (!!c.occupant) {
	    color = TAKEN;
	}
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc(x, BOTTOM, radius, 0, 2 * Math.PI); // circle
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	if (c.occupant != null) { // show client label	
	    ctx.fillStyle = '#ffffff';
	    ctx.font = 'bold ' + fs + 'px Courier';	    
	    ctx.fillText(c.occupant.label, x - fs, BOTTOM);
	}
	x += (unit + MARGIN);
    }
}
    
function drawWorkers() {
    let x = MARGIN;
    let half = Math.ceil(unit / 2);
    for (const c of workers) {
	let color = IDLE;
	if (!!c.occupant) {
	    color = BUSY;
	}
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.rect(x, MARGIN, unit, unit);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	if (!!c.occupant) { // show client label	
	    ctx.fillStyle = '#000000';
	    ctx.font = 'bold ' + fs + 'px Courier';	    
	    ctx.fillText(c.occupant.label, x + half - fs, MARGIN + half);
	}	
	x += (unit + MARGIN);
    }
}

/* 
   adapted from
   https://stackoverflow.com/questions/45309447/calculating-median-javascript
*/
function median(v){
    if (v.length === 0) {
	return 0;
    }
    v.sort(function(a, b){
	return a - b;
    });
    var h = Math.floor(v.length / 2);
    if (v.length % 2) {
	return v[h];
    }
    return (v[h - 1] + v[h]) / 2.0;
}

/* adapted from
   https://reqbin.com/code/javascript/m81eb1ms/javascript-sum-array-example
*/
function average(v) {
    if (v.length == 0) {
	return 0;
    } else if (v.length == 1) {
	return v[0];
    }
    let sum = v.reduce(function(a, b){
	return a + b;
    });
    return sum / v.length;
}

/* 
   adapted from 
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max 
*/
function maximum(v) {
    if (v.length == 0) {
	return '';
    } else if (v.length == 1) {
	return v[0];
    }
    return v.reduce((a, b) => Math.max(a, b), -Infinity);   
}

function updateStats() {
    let ws = wt.getElementsByTagName('tbody')[0];
    let ic = [];
    let bc = [];
    let sc = [];
    for (let i = 0; i < workers.length; i++) {
	let w = workers[i];
	ic.push(w.idle);
	bc.push(w.busy);
	sc.push(w.served);
    }
    for (let i = 0; i < workers.length; i++) {	
	let r = ws.rows[i];
	let w = workers[i];	
	if (i == 0) { // simulation label AND worker label come first
	    r.cells[2].innerHTML = w.idle;	    	    
	    r.cells[3].innerHTML = average(ic).toFixed(2);
	    r.cells[4].innerHTML = w.busy;
	    r.cells[5].innerHTML = average(bc).toFixed(2);	    
	    r.cells[6].innerHTML = w.served;
	    r.cells[7].innerHTML = average(sc).toFixed(2);    	    
	} else { // cell zero has the worker label
	    r.cells[1].innerHTML = w.idle;	    
	    r.cells[2].innerHTML = w.busy;	    
	    r.cells[3].innerHTML = w.served;
	}
    }
    let cs = ct.getElementsByTagName('tbody')[0];
    r = cs.rows[0];
    r.cells[1].innerHTML = satisfied;
    r.cells[2].innerHTML = impatient;
    r.cells[3].innerHTML = rejected;
    r.cells[4].innerHTML = average(wait).toFixed(2);
    r.cells[5].innerHTML = median(wait).toFixed(0);
    r.cells[6].innerHTML = maximum(wait);
}


function data() {
    let stat = wt.getElementsByTagName('tbody');    
    let tb = stat[0];
    // add with the required number of rows for the workers
    let n = workers.length;
    console.log('Adding', n, 'new rows to the worker stats table');    
    for (let i = 0; i < n; i++) {
	tb.insertRow(i);
    }
    for (let i = 0; i < n; i++) {    
	let row = tb.rows[i]; 
	let p = 0;
	if (i == 0) {
	    let slabel = row.insertCell(p++);
	    slabel.innerHTML = 'Simulation ' + scount;
	    let sl = 'sl' + scount;
	    slabel.id = sl;
	}
	let wlabel = row.insertCell(p++);
	wlabel.innerHTML = 'Worker ' + (i + 1);	

	let idleown = row.insertCell(p++);
	idleown.innerHTML = "";
	if (i == 0) {
	    let idleavg = row.insertCell(p++);
	    idleavg.innerHTML = "";	    
	    let sl = 'ia' + scount;
	    idleavg.id = sl;
	}

	let busyown = row.insertCell(p++);
	busyown.innerHTML = "";
	if (i == 0) {
	    let busyavg = row.insertCell(p++);
	    busyavg.innerHTML = "";	    
	    let sl = 'ba' + scount;
	    busyavg.id = sl;
	}

	let servedown = row.insertCell(p++);
	servedown.innerHTML = 0;
	if (i == 0) {
	    let savg = row.insertCell(p++);
	    savg.innerHTML = "";	    
	    let sl = 'sa' + scount;
	    savg.id = sl;
	}	
    }

    document.getElementById('sl' + scount).rowSpan = n;
    document.getElementById('ia' + scount).rowSpan = n;
    document.getElementById('ba' + scount).rowSpan = n;
    document.getElementById('sa' + scount).rowSpan = n;

    stat = ct.getElementsByTagName('tbody');    
    row = (stat[0]).insertRow(0);
    let slabel = row.insertCell(0);	    
    let s = row.insertCell(1);
    let c = row.insertCell(2);
    let l = row.insertCell(3);
    let a = row.insertCell(4);
    let me = row.insertCell(5);
    let ma = row.insertCell(6);	
    slabel.innerHTML = 'Simulation ' + scount;
    s.innerHTML = 0;
    c.innerHTML = 0;
    l.innerHTML = 0;
    a.innerHTML = '';
    me.innerHTML = '';
    ma.innerHTML = '';

    scount++; // new stats each time
}

let t = 0; // time remaining
let button = document.getElementById('sim');	
let clientcount = null;
let workercount = null;
let maxwait = null;
let capacity = null;
let preference = {};

function step() {
    if (Math.random() < arrivalrate) { // a new arrival
	let c = Math.floor(Math.random() * clientcount); // which client
	console.log('Client', c, 'arrives')
	let present = false;
	for (const p of pending) {
	    if (p.label == c) {
		console.log('Client', c, 'is already waiting');
		present = true;
		break;
	    } else {
		console.log(p, 'is waiting');
	    }
	}
	for (const w of workers) {
	    if (!!w.occupant) {
		if (w.occupant.label == c) {
		    console.log('Client', c, 'is already being served');
		    present = true;
		    break;		
		} else {
		    console.log(w.occupant.label, 'is being served');
		}
	    }
	}
	if (!present) {
	    console.log('This is a true arrival of a new client');
	    let client = {}; // track the client visit
	    client.label = c;
	    client.waited = 0;
	    client.seat = null;
	    for (const chair of loungechairs) { // find a seat
		if (chair.occupant == null) { // nobody sits there yet
		    chair.occupant = client; // the chair becomes occupied
		    client.seat = chair; // this will be their chair
		    pending.push(client); // they wait
		    console.log('Client', c, 'sits in chair', chair.label);
		    break; // just needs one seat
		} else {
		    console.log('Seat', chair.label, 'is taken');
		}
	    }
	    if (client.seat == null) {
		console.log('Client', c, 'could not find a seat')	    
		rejected += 1; // this client does not fit in the lounge
	    }
	}
    }
    // update the visualization
    ctx.clearRect(0, 0, canvas.width, canvas.height);    
    drawLounge();
    drawWorkers();    
    // progress the services
    tickWorkers();
    tickLounge();
    updateStats();        
    t--;
    if (t > 0) {
	setTimeout(step, speed);
    } else {
	button.disabled = false; // done
	console.log('Simulation concluded');
    }
}

function reset() {
    setup();    
}

function simulate() {
    button.disabled = true;    
    reset();
    ordered = (document.getElementById('policy').value == 'longest');
    if (ordered) {
	console.log('The coiffeur who has been idle the longest has priority');
    } else {
	console.log('The idle time has no effect on work assignment');
    }
    keep = document.getElementById('retain').checked;
    if (keep) {
	console.log('Customers will be loyal to their first assigned coiffeur');
    } else {
	console.log('Customers do not care which coiffeur serves them');
    }
    arrivalrate = parseInt(document.getElementById('arrivalrate').value) / 100;
    servicerate = parseInt(document.getElementById('servicerate').value) / 100;
    speed = 100 + (100 - parseInt(document.getElementById('speed').value)) * 10;
    impatient = 0;
    rejected = 0;
    satisfied = 0;
    pending = [];
    wait = [];
    preference = {};
    clientcount = parseInt(document.getElementById('clients').value);
    workercount = parseInt(document.getElementById('workers').value);
    maxwait = parseInt(document.getElementById('churn').value);
    capacity = parseInt(document.getElementById('lounge').value);
    t = parseInt(document.getElementById('duration').value);
    data(); // prep the stats tables
    step();
    
}

document.getElementById('workers').addEventListener('change', setup);
document.getElementById('lounge').addEventListener('change', setup);

window.addEventListener('resize', setup);
setup();

