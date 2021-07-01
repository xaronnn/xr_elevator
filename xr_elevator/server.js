// noinspection JSUnresolvedFunction

let elevators = false;
const debug = true;
let fetchState = false;
let posState = false;

const initConfig = async () => {
    if(!elevators) {
        elevators = JSON.parse(LoadResourceFile(GetCurrentResourceName(), "./config.json"));
        await initConfig();
    } else {
        return elevators;
    }
};
const log = (text) => {
    console.log(text);
};

(async () => {
    await initConfig();
})();

RegisterServerEvent("fetchElevators")
AddEventHandler("fetchElevators", async (station) => {
    if(!fetchState) {
        fetchState = true;
        log("fetchElevators:1 triggered")
        console.log("server fetch elevator send to client")
        console.log(elevators)
        TriggerClientEvent("fetchElevators", -1, elevators, station)
        setTimeout(() => {
            fetchState = false;
        }, 1000);
    }
})

RegisterServerEvent("updateElevatorNextFloor")
AddEventHandler("updateElevatorNextFloor", (station, floor) => {
    elevators[station].currentFloor = floor;
});

RegisterServerEvent("updateElevatorPos")
AddEventHandler("updateElevatorPos", (station, z) => {
    //console.log("updating "+station+" pos to: "+z)
    //TriggerClientEvent("fetchElevators", -1, (station ? (elevators[station] ? elevators[station] : false) : elevators), station)
    elevators[station].currentPosition.z = z;
    /*if(!posState) {
        posState = true;
        elevators[station].currentPosition.z = z;
        setTimeout(() => {
            posState = false;
        }, 1000);
    }*/
})

setInterval(() => {
    Object.keys(elevators).forEach((k, v) => {
        TriggerClientEvent("fetchElevators", -1, k, true)
        /*console.log("elevator: "+k);
        console.log(elevators[k].currentPosition);
        console.log("======================")*/
    })
}, 3000)


//network mapping

/*
    player -> distance = client request elevator data from server;
    server push elevators data to all players;
    if object not created, create and do;
        client on server emit -> if is busy, create object on current pos, fetch current and go to next floor with anim (pushing current position to server in while loop)
                              -> if not busy, just create object on current position (server data)
    if already created, just do;
        client on server emit (used by player with command) -> if is busy, fetch current and go to next floor with anim (pushing current position to server in while loop)
                              -> if not busy, just create object on current position (server data)

 */