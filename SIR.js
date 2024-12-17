
// Ustvarjanje dinamičnih spremenljivk
var SZO, infektivnost, intenzivnostKontaktov, stopCas, populacija;
var steviloAgentov = 0;

//ustvarjanje statičnih spremenljivk
var cas = 0;
var index = 1;
var agenti = new Array();
var startaj = false;
var koracniZagonBool = false;
can1 = document.getElementById("platnoAgentni"); // v html delu poiščemo platno1; spremenljivka can1 sedaj predstavlja platno1
plat1 = can1.getContext("2d"); // od tu dalje delamo s spremenljivo plat1 (za izris na platnu iz id "platno1")
var agentiTabela = new Array();

// --------------------------------------------------------------- PRIDOBITEV REALNIH PODATKOV --------------------------------------------------

var parsedData = {};

async function fetchCSV() {
    try {
        const response = await fetch("https://ulicar.si/MKS/"); // URL for the backend CSV file
        if (!response.ok) throw new Error("Failed to fetch the CSV file");

        const csvData = await response.text();
        parseCSV(csvData);

    } catch (error) {
        console.error("Error fetching the CSV file:", error);
    }
}

function parseCSV(data) {
    const rows = data.trim().split("\n");
    const headers = rows[0].split(",").map(header => header.trim()); // Get headers

    // Initialize parsedData dynamically based on headers
    parsedData = headers.reduce((acc, header) => {
        acc[header] = [];
        return acc;
    }, {});

    // Process each row
    rows.slice(1).forEach(row => {
        const values = row.split(",").map(value => value.trim());
        
        headers.forEach((header, index) => {
            const value = values[index];

            // Store value directly if it's not a number (e.g., Datum), else parse as number
            if (isNaN(value) || value === "") {
                parsedData[header].push(value); // Keep as string
            } else {
                parsedData[header].push(Number(value)); // Convert to number
            }
        });
    });
}

fetchCSV();

//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- PRIDOBITEV POPULACIJE ---------------------------------------------------------------
var podatkiDrzave = {
    'Slovenija': {'populacija': 2078932},
    'Australija': {'populacija': 25499881},
    'Nova Zelandija': {'populacija': 4822233}
};
var drzava;
var datumi = [];
var okuzbe = [];
function pridobiPopulacijo() {
    datumi = parsedData["Datum"];
    console.log(datumi);
    drzava = document.getElementById("drzave").value;
    okuzbe = parsedData[drzava]; // Get the data for the selected country
    populacija = podatkiDrzave[drzava].populacija; // Get the population for the selected country
    if (drzava==='Australija'){steviloAgentov = Math.floor(okuzbe[okuzbe.length-1]/3);} else{steviloAgentov = okuzbe[okuzbe.length-1];}
    
}

//------------------------------------------------------------------------------------------------------------------------------------------------



// --------------------------------------------------------------- NORMALIZACIJA AGENTOV ----------------------------------------------------
function skalirajSimuliraneOkuzene(okuzeniAgenti) {
    let ok = okuzeniAgenti*(steviloAgentov/populacija);
    let koeficient = populacija/steviloAgentov * steviloAgentov/populacija ;
    return Math.sqrt(ok*koeficient);
}




// --------------------------------------------------------------- DOLOČANJE VELIKOSTI CANVAS ----------------------------------------------------
function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function initCanvasSizes() {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(resizeCanvas);
}
//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- RAZRED AGENT ----------------------------------------------------------------
class Agent {
    constructor(x, y, xVel, yVel, barva) { // konstruktorska funkcija (ustvari agenta, t.j. poda pozicijo x, y ter hitrosti xVel, yVel)
        this.x = x; // spremenjivka za x koordinato
        this.y = y; // spremenljivka za y koordinato
        this.xVel = xVel; // sprememba x koordinate (dx - diferenca x-a)
        this.yVel = yVel; // sprememba y koordinate (dy - diferenca y-a)
        this.barva = barva; // določimo barvo agenta
        this.trk = 0; // če je trk = 1, potem je prišlo do
        this.casOkuzbe;
        this.casOzdravljenja;
    }

    osveži () {
        this.x = this.x + this.xVel;
        this.y = this.y + this.yVel;

        if (this.x > can1.width - 5 || this.x < 0) { // če smo na desni ali levi strani na robu platna
            this.xVel = -this.xVel; // obrnemo smer
        }

        if (this.y > can1.height -5 || this.y < 0) { // če smo na spodnjem ali zgornjem delu platna
            this.yVel = -this.yVel; // obrnemo smer, če pridemo do konca robu platna zg. ali sp.
        }
        // če je x manjši od 0 ga postavimo na 0 (da se agent ne potopi v steno)
        if(this.x < 0) {this.x = 0};
        // če je y manjši od 0 ga postavimo na 0 (da se agent ne potopi v steno)
        if(this.y < 0) {this.y = 0};
        // podobno na drugem koncu platna, če je koordinata večja od širine oz. višine
        if(this.x > can1.width - 5){this.x = can1.width - 5}; // 10 je širina agenta
        if(this.y > can1.height - 5){this.y = can1.height - 5}; // 10 je širina agenta
    }
}
//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- FUNKCIONALNOST TRKOV ---------------------------------------------------------------
function preveriBllizinoAgentov() {

    agentiTabela.forEach(function(agent){
        agent.trk = 0;
    });

    številoTrkovVkoraku = 0; // števec postavimo na 0 - ob vsakem koraku ga ponastavimo
    številoTrkovRdečegaZzelenimVkoraku = 0; // ponastavite števca rdeč-zelen
    for(var i = 0; i<steviloAgentov; i++) {
        var A = agentiTabela[i]; // uvedemo novo spremenljivko zaradi berljivosti kode
        for(var j = i + 1; j<steviloAgentov; j++) {
            var B = agentiTabela[j];
            // izračunamo razlike koordinat
            var dx = B.x - A.x;
            var dy = B.y - A.y;
            var dist = Math.sqrt(dx*dx + dy*dy); // določimo razdaljo po Pitagorovem izreku

            // če je razlika v razdalji med agentoma manjša od 10 izvedemo trk
            if (dist < 5) {// če je pogoj, da sta agenta dovolj blizu izpolnjen
                A.trk = 1;
                B.trk = 1;
                številoTrkovVkoraku++; // povečamo števec za 1
                izvediTrk(i, j); // izvedemo trk med agentoma z indeksoma i in j
            }
        }
    }
    return številoTrkovVkoraku;
}

var številoTrkovVkoraku = 0;
var številoTrkovRdečegaZzelenimVkoraku = 0;

// funkcija, ki izvede trk med agentoma z indeksoma i in j
function izvediTrk(indeksPrvega, indeksDrugega) {
    var x1 = agentiTabela[indeksPrvega].x; // uvedemo novo spr. zaradi boljše berljivosti kode
    var y1 = agentiTabela[indeksPrvega].y;
    var x2 = agentiTabela[indeksDrugega].x;
    var y2 = agentiTabela[indeksDrugega].y;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var razdaljaOdboja = 3; // spr., ki določa za koliko se agenta ob trku odbijeta oz. razmakneta

    // izračunamo normalizirano razdaljo
    var normX = dx/dist;
    var normY = dy/dist;

    // določimo sredinsko točko
    var sredinskaTočkaX = (x1 + x2)/2;
    var sredinskaTočkaY = (y1 + y2)/2;

    // določimo nove pozicije
    agentiTabela[indeksPrvega].x = sredinskaTočkaX - normX * razdaljaOdboja;
    agentiTabela[indeksPrvega].y = sredinskaTočkaY - normY * razdaljaOdboja;
    agentiTabela[indeksDrugega].x = sredinskaTočkaX + normX * razdaljaOdboja;
    agentiTabela[indeksDrugega].y = sredinskaTočkaY + normY * razdaljaOdboja;

    // izmenjamo hitrosti
    var tempX = agentiTabela[indeksPrvega].xVel;
    var tempY = agentiTabela[indeksPrvega].yVel;
    agentiTabela[indeksPrvega].xVel = agentiTabela[indeksDrugega].xVel;
    agentiTabela[indeksPrvega].yVel = agentiTabela[indeksDrugega].yVel;
    agentiTabela[indeksDrugega].xVel = tempX;
    agentiTabela[indeksDrugega].yVel = tempY;

    // če trčita rdeči in zeleni, zeleni postane rdeč
    // če je prvi rdeč ("#ff0000") in drugi zelen ("#00ff00")
    let casOkrevanja = 500;
    if(agentiTabela[indeksPrvega].barva == "#ff0000" && agentiTabela[indeksDrugega].barva == "#00ff00") {
        if(Math.random()<infektivnost){
            agentiTabela[indeksDrugega].barva = "#ff0000"; // drugega agenta, ki je bil zelen pobarvamo rdeče
            agentiTabela[indeksDrugega].casOkuzbe = cas;
            agentiTabela[indeksDrugega].casOzdravljenja = cas + casOkrevanja;
        }
        številoTrkovRdečegaZzelenimVkoraku++;
    }

    // če je prvi zelen ("#00ff00") in drugi rdeč ("#ff0000")
    else if(agentiTabela[indeksPrvega].barva == "#00ff00" && agentiTabela[indeksDrugega].barva == "#ff0000") {
        if (Math.random() < infektivnost){
            agentiTabela[indeksPrvega].barva = "#ff0000"; // prvega agenta, ki je bil zelen pobarvamo rdeče
            agentiTabela[indeksPrvega].casOkuzbe = cas;
            agentiTabela[indeksPrvega].casOzdravljenja = cas + casOkrevanja;
        }
        številoTrkovRdečegaZzelenimVkoraku++;
    }

}

//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- FUNKCIJA ZA IZRIS AGENTOV---------------------------------------------------------------
function izrisiAgente(agenti){
    agenti.forEach(function(agent){
        if(agent.barva == "#ff0000"){
           stevecRdecih++;
        }
        if(agent.barva == "#00ff00"){
            stevecZelenih++;
        }

        plat1.fillStyle = agent.barva; // določimo barvo izrisa glede na lastnost agenta
        plat1.fillRect(agent.x, agent.y, 5, 5); // x zg. L kot, y zg. L kot, širina, višina

        if(agent.trk == 1){
            plat1.beginPath();
            plat1.lineWidth = "3";
            plat1.strokeStyle = "blue";
            plat1.rect(agent.x,agent.y,5,5);
            plat1.stroke();
        }
    });
}
//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- RAZRED MULTIGRAF ---------------------------------------------------------------
class MultiGraf {
    constructor(idPlatna, maxGrafX, maxGrafY, naslov) {
        // Boilerplate za platno
        this.platno = document.getElementById(idPlatna); // Poiščemo platno v HTML
        this.kontekst = this.platno.getContext("2d"); // Dobimo risalni kontekst

        // Nastavitve lastnosti
        this.x = new Array(); // Polje za x-vrednosti
        this.y1 = new Array(); // Polje za prvo krivuljo (rdeča)
        this.y2 = new Array(); // Polje za drugo krivuljo (modra)
        this.y3 = new Array(); // Polje za tretjo krivuljo (zelena)

        this.sirinaPlatna = this.platno.width; // Širina platna
        this.visinaPlatna = this.platno.height; // Višina platna
        this.maxGrafX = maxGrafX; // Maksimalna vrednost po x
        this.maxGrafY = maxGrafY; // Maksimalna vrednost po y (enaka za vse krivulje)
        this.naslov = naslov; // Naslov grafa

        // Napolnimo polje x z začetnimi vrednostmi [0, 1, 2, ...]
        for (let i = 0; i < this.maxGrafX + 1; i++) {
            this.x[i] = i;
        }
    }

    // Dodamo novo vrednost za vsako krivuljo (y1, y2, y3)
    dodajVrednost(yVrednost1, yVrednost2, yVrednost3) {
        this._posodobiPolje(this.y1, yVrednost1); // Posodobimo y1
        this._posodobiPolje(this.y2, yVrednost2); // Posodobimo y2
        this._posodobiPolje(this.y3, yVrednost3); // Posodobimo y3
    }

    // Pomozna funkcija za posodobitev polja (zamenja staro vrednost, če je polje polno)
    _posodobiPolje(polje, vrednost) {
        if (polje.length === this.maxGrafX + 1) {
            polje.splice(0, 1); // Odstranimo prvo vrednost, če je polje polno
        }
        polje.push(vrednost); // Dodamo novo vrednost na konec
    }

    // Funkcija za izris grafa z vsemi tremi krivuljami
    izrisi() {
        // Počistimo platno
        this.kontekst.clearRect(0, 0, this.sirinaPlatna, this.visinaPlatna);

        // Izrisemo naslov
        this.kontekst.font = "15px Arial";
        this.kontekst.fillStyle = "#000000";
        this.kontekst.fillText(this.naslov, 10, 20);

        // Izrisemo vse tri krivulje
        this._izrisiKrivuljo(this.y1, "#ff0000"); // Rdeča krivulja
        this._izrisiKrivuljo(this.y2, "#0000ff"); // Modra krivulja
        this._izrisiKrivuljo(this.y3, "#00ff00"); // Zelena krivulja
    }

    // Pomozna funkcija za izris posamezne krivulje
    _izrisiKrivuljo(vrednosti, barva) {
        this.kontekst.beginPath();
        this.kontekst.strokeStyle = barva;

        for (let i = 0; i < vrednosti.length; i++) {
            const xPozicija = (this.x[i] / this.maxGrafX) * this.sirinaPlatna; // Skaliranje x-pozicije
            const yPozicija = this.visinaPlatna - (vrednosti[i] / this.maxGrafY) * this.visinaPlatna; // Skaliranje y-pozicije

            if (i === 0) {
                this.kontekst.moveTo(xPozicija, yPozicija); // Začetek risanja
            } else {
                this.kontekst.lineTo(xPozicija, yPozicija); // Povezovanje točk
            }
        }

        this.kontekst.stroke(); // Izris črte na platno
    }
}

//------------------------------------------------------------------------------------------------------------------------------------------------


//---------------------------------------------------------------- RAZRED DISKRETNI GRAF ---------------------------------------------------------
class GrafDiskretnihVrednosti {
    constructor(idPlatna, maxGrafX, maxGrafY) { // pri konst. funkc. imamo kot arg. id platna, maksimum po x in y osi, t.j. tri argumente
        this.can1 = document.getElementById(idPlatna); // v html delu poiščemo platno1; spremenljivka can1 sedaj predstavlja platno1
        this.plat1 = this.can1.getContext("2d"); // od tu dalje delamo s spremenljivo plat1 (za izris na platnu iz id "platno1")
        this.naslov = "Število trkov v koraku"; // naslov grafa
        this.plat1.strokeStyle = "#ff0000"; // določimo barvo polnila, hex oblika #RRGGBB
        this.x = new Array(); // ustvarimo novo tabelo x (polje), lahko bi zapisali tudi var x = []; (spremenljivka tipa Array)
        this.y = new Array(); // ustvarimo novo tabelo y (polje), lahko bi zapisali tudi var y = []; (spremenljivka tipa Array)
        this.maxGrafX = maxGrafX; // maksimum po abscisi
        this.maxGrafY = maxGrafY; // maksimum po ordinati

        this.resizeCanvas();

        // napolnimo polje x
        for (var i = 0; i < this.maxGrafX + 1; i++) {
            this.x[i] = i; // za x zapišemo [0, 1, 2, ...], t.j. vrednost i-ja
        }
    }
    // dinamična posodobitev velikosti platna
    resizeCanvas() {
        const rect = this.can1.getBoundingClientRect();
        this.can1.width = rect.width;
        this.can1.height = rect.height;
        this.širinaPlatna = this.can1.width;
        this.višinaPlatna = this.can1.height;
    }

    dodajVrednostAliBrišiInDodaj(yVrednost) {
        if (this.y.length == this.maxGrafX + 1) { // če je platno veliko 10x10 imamo 11x11 točk, zaradi tega "+1"
            this.y.splice(0, 1); // v primeru, da je tabela vrednosti polna na mestu 0 v tabeli y brišemo eno vrednost
            this.y[this.maxGrafX] = yVrednost; // in novo vrednost dodamo na koncu polja
        } else { // če polje z vrednostmi še ni polno
            this.y.push(yVrednost); // če tabela y še ni polna potisnemo novo vrednost v polje
        }
    }

    izriši(yVrednost) {
        this.dodajVrednostAliBrišiInDodaj(yVrednost);
        this.plat1.clearRect(0, 0, this.širinaPlatna, this.višinaPlatna);

        this.plat1.font = "15px Arial";
        this.plat1.strokeStyle = "#000000";
        this.plat1.strokeText(this.naslov, 10, 20);

        this.plat1.beginPath(); // Start a single path
        this.plat1.strokeStyle = "#ff0000";

        for (var i = 0; i < this.y.length; i++) {
            const x = (this.x[i] / this.maxGrafX) * this.širinaPlatna;
            const yTop = this.višinaPlatna - (this.y[i] / this.maxGrafY) * this.višinaPlatna;

            // Draw a vertical bar for each value
            this.plat1.moveTo(x, this.višinaPlatna);
            this.plat1.lineTo(x, yTop);
        }
        this.plat1.stroke(); // Render all bars in a single operation
    }
}
//-----------------------------------------------------------------------------------------------------------------------------------------------



// --------------------------------------------------------------- REALNI PODATKI ---------------------------------------------------------------
var okuzeniR = 0;
var dovzetniR = 0;
var preboleliR = 0;
function pridobiRealnePodatke() {
    if (cas > index * (Math.floor(stopCas/okuzbe.length))){
        if (index <= okuzbe.length - 1) {
            document.getElementById("datum").innerHTML = datumi[index];
            if(index > 14) {
                preboleliR = 0;
                for (let i=1; i<index-14; i++) {
                    preboleliR = preboleliR + okuzbe[i] - okuzbe[i-1];
                }
            }
            okuzeniR = okuzbe[index] - preboleliR;
            dovzetniR = (populacija - okuzbe[index]- preboleliR);
            document.getElementById("dovzetniR").innerHTML = dovzetniR;
            document.getElementById("okuzeniR").innerHTML = okuzeniR;
            document.getElementById("preboleliR").innerHTML = preboleliR;
            index++;
        }
    }
}
//------------------------------------------------------------------------------------------------------------------------------------------------


//---------------------------------------------------------------- SIR MODEL ----------------------------------------------------------------------
var okuzeniSIR = 0;
var preboleliSIR = 0;
var dovzetniSIR, dovzetniSIRCap;
var ustvarjeniSIR = false;

function preracunajSIR(DeltaTime = 0.001, hitrostPrehoda = 2) {
    // Izračun števila dovzetnih
    if (okuzbe[index] !== 0 && ustvarjeniSIR===false){
        okuzeniSIR = okuzbe[index];
        ustvarjeniSIR = true;
    }
    dovzetniSIR = populacija - okuzeniSIR - preboleliSIR;
    dovzetniSIRCap = okuzbe[okuzbe.length-1] - okuzeniSIR - preboleliSIR;
    // Izračun novih okužb z upoštevanim časovnim korakom
    const noveOkužbeSIR = infektivnost * okuzeniSIR* intenzivnostKontaktov * dovzetniSIRCap / (dovzetniSIRCap+okuzeniSIR)*DeltaTime;
    const noviPreboleli = hitrostPrehoda * okuzeniSIR * DeltaTime;

    // Posodobimo vrednosti okuženih in dovzetnih
    okuzeniSIR += noveOkužbeSIR-noviPreboleli;
    preboleliSIR += noviPreboleli;
    //if(okuzeniSI>okuzbe[okuzbe.length-1]) {okuzeniSI=okuzbe[okuzbe.length-1];}
    dovzetniSIR = populacija - okuzeniSIR - preboleliSIR;
    dovzetniSIRCap = okuzbe[okuzbe.length-1] - okuzeniSIR - preboleliSIR;

    //Preverimo meje
    if (dovzetniSIRCap < 0) dovzetniSIRCap = 0;
    if (okuzeniSI < 0) okuzeniSI = 0;

    // Posodobimo vrednosti v HTML
    document.getElementById('okuzeniSI').innerHTML = Math.floor(okuzeniSIR);
    document.getElementById('dovzetniSI').innerHTML = Math.floor(dovzetniSIR);
    document.getElementById('preboleliSI').innerHTML = Math.floor(preboleliSIR);
    // Posodobimo grafe
    return Math.floor(okuzeniSIR), Math.floor(dovzetniSIR);
}
//-----------------------------------------------------------------------------------------------------------------------------------------------


//---------------------------------------------------------------- SSE IZRAČUN ------------------------------------------------------------------
// funkcija, ki preračuna SSE za SI model glede na realne podatke
var SSESI = 0;
function izracunajSSESIR(realni_podatki, podatki_modela) {
    SSESI += Math.pow(realni_podatki - podatki_modela, 2);
    document.getElementById('SSESI').innerHTML = Math.floor(SSESI);
}
// funkcija, ki preračuna SSE za agentni model glede na realne podatke
var SSEA = 0;
function izracunajSSEA(realni_podatki, podatki_modela) {
    SSEA += Math.pow(realni_podatki - podatki_modela, 2);
    document.getElementById('SSEA').innerHTML = Math.floor(SSEA);
}
//------------------------------------------------------------------------------------------------------------------------------------------------



//---------------------------------------------------------------- OPTIMIZACIJA PARAM "POHECKANO" -----------------------------------------------------------
async function OP() {
    pridobiPopulacijo(); // Initialize `drzava` and related parameters
    initCanvasSizes(); // Initialize dynamic canvas sizes
    if (!drzava || !parsedData || !parsedData[drzava]) {
        console.error("Parsed data or selected country data not found!");
        return;
    }

    const stopČas = 5000; // Total simulation time in ms

    const canvasWidth = can1.width; // Dynamic canvas width
    const canvasHeight = can1.height; // Dynamic canvas height
    const agentSize = 5; // Size of each agent
    const interactionRadius = 3; // Interaction radius for infection spread
    const agentSpeed = 1; // Average agent movement speed (pixels per frame)

    const agentDensity = steviloAgentov / ((canvasWidth / agentSize) * (canvasHeight / agentSize)); // Density of agents in canvas

    // Calculate collision probability dynamically
    const collisionProbability = calculateDynamicCollisionProbability(
        steviloAgentov,
        agentDensity,
        interactionRadius,
        agentSpeed,
        canvasWidth,
        canvasHeight
    );

    // Dynamically set infektivnost based on collision probability
    let infektivnost = calculateOptimalInfektivnost(collisionProbability, stopČas, steviloAgentov);
    
    const population = populacija;
    let { optimalIntenzivnost, optimalDeltaTime } = optimizeSIModelParams(
        infektivnost,
        okuzbe,
        stopČas
    );

    if (infektivnost>1){infektivnost=1;}

    // Apply optimal parameters
    applyOptimalParams(infektivnost, Math.floor(optimalIntenzivnost*1.5), optimalDeltaTime);
}


// Helper function to calculate dynamic collision probability
function calculateDynamicCollisionProbability(steviloAgentov, density, interactionRadius, agentSpeed, canvasWidth, canvasHeight) {
    const interactionArea = Math.PI * Math.pow(interactionRadius, 2); // Area of interaction radius
    const totalCanvasArea = canvasWidth * canvasHeight;

    // Collision probability per agent per frame
    const singleAgentCollisionProbability = (interactionArea / totalCanvasArea) * agentSpeed;

    // Aggregate collision probability
    const totalCollisionProbability = singleAgentCollisionProbability * steviloAgentov;

    // Normalize to [0, 1]
    return Math.min(totalCollisionProbability, 1);
}

// Helper function to optimize intenzivnost and deltaTime
// Helper function to optimize intenzivnost and deltaTime
function optimizeSIModelParams(infektivnost, realData, stopČas) {
    const realDataSteps = realData.length;
    const timeNormalization = Math.floor(stopČas / realDataSteps); // Normalize simulation time

    // Find the start index of infections
    for (let i = 0; i < okuzbe.length; i++) {
        if (okuzbe[i] > 0) {
            startIndex = i;
            break;
        }
    }
    
    let bestIntenzivnost = 5; // Initialize to the start of the range
    let bestDeltaTime = 0.01; // Initialize to the start of the range
    var bestScore = 999999999999999;

    // Grid search over the defined range
    for (let intenzivnost = 1; intenzivnost <= 20; intenzivnost += 1) {
        for (let deltaTime = 0.001; deltaTime <= 0.5; deltaTime += 0.001) {
            const simulatedData = simulateSIModel(
                deltaTime,
                infektivnost,
                intenzivnost,
                stopČas-startIndex*timeNormalization,
            );
            let SSE = 0;

            for (let i = startIndex; i < okuzbe.length-startIndex; i++) {
                //console.log("deltaTime:", deltaTime, "intenzivnost:", intenzivnost);
                //console.log("RealData:", okuzbe[i], "SimulatedData:", simulatedData[i*timeNormalization]);
                SSE += SumSquareError(okuzbe[i], simulatedData[i*timeNormalization]);
                if (SSE === NaN) {break;}
            }
            if (SSE < bestScore && SSE !== NaN && simulatedData[simulatedData.length-1] >= okuzbe[okuzbe.length-1]) {
                bestScore = SSE;
                bestIntenzivnost = intenzivnost;
                bestDeltaTime = deltaTime;
            }
        }
    }

    console.log(`Najdeni optimalni parametri: Intenzivnost=${bestIntenzivnost*0.8}, DeltaTime=${bestDeltaTime*1.5},SSE=${bestScore}`);
    return { optimalIntenzivnost: bestIntenzivnost, optimalDeltaTime: bestDeltaTime };
}


function SumSquareError(realni_podatki, podatki_modela) {
    let SSE = Math.pow(realni_podatki - podatki_modela, 2);
    return SSE;
}

// Helper function to calculate optimal infektivnost
function calculateOptimalInfektivnost(collisionProbability, stopČas, steviloAgentov) {
    const targetInfectionRate = 1; // 100% infection by the end of simulation
    return ((targetInfectionRate / (collisionProbability * steviloAgentov)) * stopČas) / 100;
}

function simulateSIModel(DeltaTime, infektivnost, intenzivnostKontaktov, stopCas) {
    let simulatedData = new Array();
    let populacija = okuzbe[okuzbe.length-1]
    let okuzeniSI = 1;
    simulatedData.push(Math.floor(okuzeniSI));
    let dovzetniSICap = okuzbe[okuzbe.length-1] - okuzeniSI;

    for (let i=0; i<stopCas; i++) {
        // Izračun novih okužb z upoštevanim časovnim korakom
        const noveOkužbeSI = infektivnost * okuzeniSI* intenzivnostKontaktov * dovzetniSICap / (populacija)*DeltaTime;

        // Posodobimo vrednosti okuženih in dovzetnih
        okuzeniSI += noveOkužbeSI;
        simulatedData.push(Math.floor(okuzeniSI));
        //if(okuzeniSI>okuzbe[okuzbe.length-1]) {okuzeniSI=okuzbe[okuzbe.length-1];}
        dovzetniSICap = populacija - okuzeniSI;
    }
    // Posodobimo grafe
    return simulatedData;
}


// Helper function to calculate the difference between real and SI model data
function calculateDifference(realData, simulatedData) {
    let difference = 0;

    for (let i = 0; i < realData.length; i++) {
        difference += Math.pow(realData[i] - simulatedData[i], 2); // Sum of squared errors
    }

    return difference;
}

// Apply the optimal parameters to the model
function applyOptimalParams(infektivnost, intenzivnost, deltaTime) {
    document.getElementById('infektivnost').value = infektivnost;
    document.getElementById('IntKont').value = intenzivnost;
    document.getElementById('DeltaT').value = deltaTime;
    preracunajSIR.deltaTime = deltaTime; // Apply deltaTime globally
}


// --------------------------------------------------------------- INICIALIZACIJA ---------------------------------------------------------------
var grafOkuzeni, grafDovzetni, grafPovprecja, grafDiskretni;
function inicializacija() {
    initCanvasSizes();
    infektivnost = document.getElementById("infektivnost").value;
    intenzivnostKontaktov = document.getElementById("IntKont").value;
    preracunajSIR.deltaTime = document.getElementById("DeltaT").value;
    preracunajSIR.hitrostPrehoda = document.getElementById("hitrostPrehoda").value;
    stopCas = 5000;
    
    //pridobimo populacijo glede na izbrano državo
    pridobiPopulacijo();
    console.log(steviloAgentov);
    //ustvarimo agenta
    for (let i = 0; i < steviloAgentov; i++) {
        agentiTabela[i] = new Agent(Math.random() * can1.width, Math.random() * can1.height, Math.random() * 2 - 1, Math.random() * 2 - 1, "#00ff00");
    }
    grafOkuzeni = new MultiGraf("okuzeni", stopCas, okuzbe[okuzbe.length - 1]+100, "Število okuženih");
    grafDovzetni = new MultiGraf("dovzetni", stopCas, okuzbe[okuzbe.length - 1]+100, "Število dovzetnih");
    grafPreboleli = new MultiGraf("preboleli", stopCas, okuzbe[okuzbe.length - 1]+100, "Število prebolelih");
    grafDiskretni = new GrafDiskretnihVrednosti("diskretni", 5000, steviloAgentov/10);

    cas = 1;
}
//------------------------------------------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------- ZAGONSKE FUNKCIJE ---------------------------------------------------------------
var aktiven, stevecRdecih, stevecZelenih, stevecModrih;
var ustvarjeni = false;
function zanka() {
    stevecModrih = 0;
    stevecRdecih = 0;
    stevecZelenih = 0;
    plat1.clearRect(0, 0, can1.width, can1.height); // brišemo platno
    let številoTrkov = preveriBllizinoAgentov();
    preveriBllizinoAgentov(); // preverimo trke

    for(var i = 0; i < steviloAgentov; i++) {
        agentiTabela[i].osveži(); // imamo več agentov (z indeksom i)
    }
    if (okuzbe[index] !== 0 && ustvarjeni===false){
        for(let i=0; i<Math.floor(okuzeniR);i++){
            agentiTabela[i].barva = "#ff0000";
            ustvarjeni=true;
        }
    }
    for(var i = 0; i < steviloAgentov; i++) {
        if(agentiTabela[i].casOzdravljenja !== undefined && agentiTabela[i].casOzdravljenja <= cas){
            agentiTabela[i].barva = "#0000ff";
            stevecModrih++;
        }
        if(agentiTabela[i].casImunosti !== undefined && agentiTabela[i].casImunosti <= cas){
            agentiTabela[i].barva = "#00ff00";
        }
    }
    izrisiAgente(agentiTabela); // izris agentov
    pridobiRealnePodatke(); // pridobimo realne podatke
    preracunajSIR();
    let okuzeniAgenti = stevecRdecih;
    let dovzetniAgenti = stevecZelenih;
    let preboleliAgenti = stevecModrih;
    if( drzava === 'Australija') {okuzeniAgenti = stevecRdecih*3; dovzetniAgenti = stevecZelenih*3; preboleliAgenti = stevecModrih*3;}
    izracunajSSESIR(okuzeniR, okuzeniSIR);
    izracunajSSEA(okuzeniR, okuzeniAgenti);
    //console.log(stevecRdecih*10, okuzeniR);
    document.getElementById('okuzeniA').innerHTML = okuzeniAgenti;
    document.getElementById('dovzetniA').innerHTML = populacija-okuzeniAgenti;
    document.getElementById('preboleliA').innerHTML = preboleliAgenti;
    grafOkuzeni.dodajVrednost(okuzeniAgenti, okuzeniR, okuzeniSIR); // dodamo vrednost v graf
    grafDovzetni.dodajVrednost(dovzetniAgenti, okuzbe[okuzbe.length-1]-okuzeniR - preboleliR, dovzetniSIRCap);
    grafPreboleli.dodajVrednost(preboleliAgenti, preboleliR, preboleliSIR);
    grafPreboleli.izrisi();
    grafDovzetni.izrisi();
    grafOkuzeni.izrisi(); // izris grafa
    grafDiskretni.izriši(številoTrkov);
    cas++;
}

function start(){
    if(cas >= stopCas){
        koracniZagonBool = true; // preklopimo na koračni zagon
        clearTimeout(aktiven);
    }
    else {
        zanka();
        aktiven = setTimeout(start, 1); // zanka vsake 1ms
    }
}

function stop(){
    clearTimeout(aktiven); // prekinemo časovnik
    startaj = false; 
}

function koracniZagon(){
    if(aktiven) clearTimeout(aktiven);
    koracniZagonBool = true;
    zanka(); // poženemo izvedbo glavne zanke
}

function startGumb() {
    if (cas === 0) {
        inicializacija();
        startaj = true;
    }
    startaj = true;
    start();
}
