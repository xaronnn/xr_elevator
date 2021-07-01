// noinspection JSUnresolvedFunction

Wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const debug = false;
let elevators = false;
let spawnedElevators = {};
let menu = false;
const keys = [
    21, 24, 25, 47, 58, 263, 264, 257, 140, 141, 142, 143, 75, 32, 34, 33, 35, 106
]

const log = (text) => {
    console.log(text);
}
const registerEvent = (name) => {
    RegisterNuiCallbackType(name)
}
registerEvent("callElevator");
RegisterKeyMapping('~elevator', 'Elevator Menu', 'keyboard', 'f3')


const loadModel = async (model) => {
    if(debug) log("loadModel():1 - trying to load model")
    if(HasModelLoaded(GetHashKey(model))) {
        if(debug) log("loadModel():2 - model already loaded, skipping")
        return true;
    } else {
        if(debug) log("loadModel():3 - model couldnt be loaded, trying to load again")
        do {
            RequestModel(GetHashKey(model))
            await Wait(200);
        }while(HasModelLoaded(GetHashKey(model)))
        return false;
    }
}
const fetchElevators = async (elevator = false) => {
    TriggerServerEvent("fetchElevators", elevator);
    await Wait(300);
    /*if(!elevators) {
        TriggerServerEvent("fetchElevators", elevator);
        await Wait(300);
    } else if(!elevators[elevator]) {
        TriggerServerEvent("fetchElevators", elevator);
        await Wait(300);
    }*/
    /*if(!elevators && !elevator) {
        TriggerServerEvent("fetchElevators", elevator);
    } else {
        if(elevator && !elevators[elevator]) {
            if(elevators) {
                TriggerServerEvent("fetchElevators", elevator);
            } else {
                if(elevator) {
                    await TriggerServerEvent("fetchElevators", elevator);
                    await Wait(300);
                    await fetchElevators(elevator)
                } else {
                    await TriggerServerEvent("fetchElevators", elevator);
                    await Wait(300);
                    await fetchElevators(elevator)
                    await Wait(300);
                    await fetchElevators(elevator)
                }
            }
        } else {
            if(!elevators && elevators.length <= 0) {
                await TriggerServerEvent("fetchElevators", elevator);
                await Wait(300);
                await fetchElevators(elevator)
            } else {
                if(!elevator && elevators.length <= 0) {
                    await TriggerServerEvent("fetchElevators", elevator);
                    await Wait(300);
                    await fetchElevators(elevator)
                }
            }
        }
    }
    await Wait(300);*/
}
const getElevatorStationNameByNearCoords = async (x, y, z) => {
    await fetchElevators();
    if(elevators) {
        let station = false;
        Object.keys(elevators).forEach((k, v) => {
            if(elevators[k].enabled) {
                if(GetDistanceBetweenCoords(x, y, z, elevators[k].elevator.x, elevators[k].elevator.y, elevators[k].elevator.z, false) <= elevators[k].radius) {
                    station = k;
                }
            }
        })
        return station;
    } else {
        if(debug) log("getElevatorStationNameByNearCoords() - elevator data not found, trying to fetch data and then trigger myself")
        await getElevatorStationNameByNearCoords(x, y, z);
        await Wait(300)
        return false;
    }
};
const isNearOfAnyElevatorStation = async () => {
    const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
    if(await getElevatorStationNameByNearCoords(x, y, z)) {
        return await getElevatorStationNameByNearCoords(x, y, z);
    } else {
        return false;
    }
};
const spawnElevator = async (station) => {
    if(station) {
        if(elevators[station].enabled) {
            await fetchElevators(station);
            let [x, y, z] = GetEntityCoords(PlayerPedId(), false);
            let closestElevator = GetClosestObjectOfType(x, y, z, 50, GetHashKey(elevators[station].elevator.hash), true, false, false);
            if(closestElevator == 0) {
                //log("no closest elev found")
                await loadModel(elevators[station].elevator.hash)
                let spawnElevator = CreateObject(GetHashKey(elevators[station].elevator.hash), elevators[station].currentPosition.x, elevators[station].currentPosition.y, elevators[station].currentPosition.z-0.29, false, true, false)
                SetEntityAsMissionEntity(spawnElevator)
                spawnedElevators[station] = true;
                if(debug) log("spawnElevator():1 - elevator spawned at nearest station: "+station)
                if(elevators[station].isBusy) {
                    await moveElevator(station, elevators[station].floors[elevators[station].currentFloor].floor.z)
                }
            }
        }
    }
}

const moveElevator = async (station, toZ, sendToServer= false) => {
    let moveState = false;
    let currentZ = false;
    if(station) {
        if(elevators[station]) {
            if(elevators[station].enabled) {
                let [x, y, z] = GetEntityCoords(PlayerPedId(), false);
                let closestElevator = GetClosestObjectOfType(elevators[station].currentPosition.x, elevators[station].currentPosition.y, elevators[station].currentPosition.z, 50, GetHashKey(elevators[station].elevator.hash), true, false, false);
                if(closestElevator == 0) {
                    await spawnElevator(station);
                    await moveElevator(station, toZ)
                } else {
                    if(GetEntityCoords(closestElevator, false)[2] < toZ) {
                        let floor = 0.2;
                        do {
                            if(sendToServer) {
                                if(!moveState) {
                                    moveState = true;
                                    updateElevatorPos(station, GetEntityCoords(closestElevator, false)[2]+floor)
                                    setTimeout(() => {
                                        moveState = false;
                                    }, 1000);
                                }
                            }
                            floor = floor + 0.01;
                            SlideObject(closestElevator, GetEntityCoords(closestElevator, false)[0], GetEntityCoords(closestElevator, false)[1], GetEntityCoords(closestElevator, false)[2]+floor, 0.1, 0.1, 0.1, false)
                            console.log(floor)
                            await Wait(1);
                        } while(GetEntityCoords(closestElevator, false)[2] <= toZ)
                        do {
                            updateElevatorPos(station, GetEntityCoords(closestElevator, false)[2])
                            await Wait(500);
                            if(GetEntityCoords(closestElevator, false)[2] == currentZ) {
                                currentZ = false;
                            }
                        } while(currentZ != false && GetEntityCoords(closestElevator, false)[2] != currentZ)
                    } else if(GetEntityCoords(closestElevator, false)[2] > toZ) {
                        let floor = 0.2;
                        do {
                            if(sendToServer) {
                                if(!moveState) {
                                    moveState = true;
                                    updateElevatorPos(station, GetEntityCoords(closestElevator, false)[2]-floor)
                                    setTimeout(() => {
                                        moveState = false;
                                    }, 1000)
                                }
                            }
                            floor = floor + 0.03;
                            SlideObject(closestElevator, GetEntityCoords(closestElevator, false)[0], GetEntityCoords(closestElevator, false)[1], GetEntityCoords(closestElevator, false)[2]-floor, 0.1, 0.1, 0.1, false)
                            currentZ = GetEntityCoords(closestElevator, false)[2];
                            console.log(floor)
                            await Wait(35);
                        } while(GetEntityCoords(closestElevator, false)[2] >= toZ)
                        do {
                            updateElevatorPos(station, GetEntityCoords(closestElevator, false)[2])
                            await Wait(500);
                            if(GetEntityCoords(closestElevator, false)[2] == currentZ) {
                                currentZ = false;
                            }
                        } while(currentZ != false && GetEntityCoords(closestElevator, false)[2] != currentZ)
                    }
                }
            }
        } else {
            await fetchElevators(station);
            await moveElevator(station, toZ, sendToServer)
        }
    }
}
const updateElevatorPos = (station, z) => {
    if(station) {
        if(elevators[station].enabled) {
            TriggerServerEvent("updateElevatorPos", station, z)
        }
    }
};

const fetchFloorZPosFromFloorNumber = (station, floor) => {
    if(elevators) {
        if(elevators[station].enabled) {
            if(elevators[station].floors[floor]) {
                return elevators[station].floors[floor].floor.z;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
};

RegisterCommand("den", (source, args) => {
    if(args.length == 2) {
        console.log(fetchFloorZPosFromFloorNumber(args[0], Number(args[1])))
    } else {
        console.log("invalid data entered")
    }
})

const fetchFloorNumberFromCurrentElevatorPosition = async (station) => {
    let floorNumber = false;
    if(elevators[station]) {
        if(elevators[station].enabled) {
            Object.keys(elevators[station].floors).forEach((k, v) => {
                const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
                const [eX, eY, eZ] = GetEntityCoords(GetClosestObjectOfType(x, y, z, 50, GetHashKey(elevators[station].elevator.hash), true, false, false));
                if(GetDistanceBetweenCoords(elevators[station].elevator.x, elevators[station].elevator.y, elevators[station].floors[k].floor.z, eX, eY, eZ, true) <= elevators[station].floors[k].floor.radius) {
                    floorNumber = k;
                }
            })
        }

    }
    return floorNumber;
};

const fetchFloorNumberFromCurrentPlayerPosition = async (station) => {
    let floorNumber = false;
    if(elevators[station]) {
        const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
        Object.keys(elevators[station].floors).forEach((k, v) => {
            if(GetDistanceBetweenCoords(elevators[station].elevator.x, elevators[station].elevator.y, elevators[station].floors[k].floor.z, x, y, z, true) <= elevators[station].floors[k].floor.radius) {
                floorNumber = k;
            }
        })
        return floorNumber;
    } else {
        console.log("fetchFloorNumberFromCurrentPlayerPosition() - elevator data not found, trying to fetch data and then trigger myself")
        TriggerServerEvent("fetchElevatorsData")
        await Wait(300);
        await fetchFloorNumberFromCurrentPlayerPosition(station);
        return false;
    }
};

const sendNuiMessage = (data) => SendNuiMessage(JSON.stringify(data))

DisablePlayerFiring(GetPlayerPed(-1), false)

/*setTick(async () => {
    if(IsControlJustReleased(1, 170)) {
        if(await isNearOfAnyElevatorStation()) {
            await handleMenu();
        }
    }
})*/

RegisterCommand("~elevator", async (source, args) => {
    if(await isNearOfAnyElevatorStation()) {
        await handleMenu();
    }
})



const handleMenu = async () => {
    await setMaxFloorByStation();
    if(!menu) {
        //SetCursorLocation(0.5, 0.5)
        setControlsDisplay(true);
    } else {
        setControlsDisplay(false);
    }
}

const controls = (enabled = true) => {
    if(enabled) {
        keys.forEach((k) => {
            DisableControlAction(0, k, enabled)
        })
        DisablePlayerFiring(GetPlayerPed(-1), enabled);
        if(enabled) {
            NetworkSetFriendlyFireOption(false);
        } else {
            NetworkSetFriendlyFireOption(true);
        }
    }
}
LeaveCursorMode()
SetNuiFocus(false, false);
SetNuiFocusKeepInput(false)

const setControlsDisplay = (show = true) => {
    SetNuiFocus(show, show);
    SetNuiFocusKeepInput(show);
    if(show) {
        EnterCursorMode()
    } else {
        LeaveCursorMode()
    }
    menu = show;
    sendNuiMessage({
        "type": "controls",
        "status": show
    })
}

const setCurrentFloorNumber = (floor) => {
    if(!floor) return;
    sendNuiMessage({
        "type": "setCurrentFloor",
        "floor": floor
    })
}

const setCurrentStation = (station) => {
    if(!station) return;
    sendNuiMessage({
        "type": "setCurrentStation",
        "station": station
    })
}

const setMaxFloorByStation = async () => {
    let nearStation = await isNearOfAnyElevatorStation();
    if(nearStation) {
        let maxFloor = await fetchMaxFloorsByStation(nearStation);
        setMaxFloor(maxFloor);
    }
}

const setMaxFloor = (max) => {
    sendNuiMessage({
        "type": "setMaxFloor",
        "max": max
    })
}

const setUiDisplay = (show = true) => {
    sendNuiMessage({
        "type": "ui",
        "status": show
    })
    setCallDisplay(show);
}

const setCallDisplay = (show = true) => {
    sendNuiMessage({
        "type": "call",
        "status": show
    })
}

on("__cfx_nui:callElevator", async (data, cb) => {
    let nearStation = await isNearOfAnyElevatorStation();
    if(nearStation) {
        if(nearStation == data.currentStation) {
            if(elevators) {
                if(elevators[nearStation]) {
                    if(!elevators[nearStation].isBusy) {
                        let currentElevatorFloor = await fetchFloorNumberFromCurrentElevatorPosition(nearStation);
                        let currentPlayerFloor = await fetchFloorNumberFromCurrentPlayerPosition(nearStation);
                        if(currentPlayerFloor && currentElevatorFloor && currentElevatorFloor != currentPlayerFloor) {
                            if(elevators[nearStation].floors[currentPlayerFloor]) {
                                if(fetchFloorZPosFromFloorNumber(nearStation, Number(currentPlayerFloor))) {
                                    await moveElevator(nearStation, fetchFloorZPosFromFloorNumber(nearStation, Number(currentPlayerFloor)), true)
                                    cb(true);
                                } else {
                                    cb(false);
                                }
                            } else {
                                cb(false);
                            }
                        } else {
                            cb(false);
                        }
                    } else {
                        cb(false);
                    }
                } else {
                    cb(false);
                }
            } else {
                cb(false);
            }
        } else {
            cb(false)
        }
    } else {
        cb(false)
    }
});

(async () => {
    await loadModel("xm_prop_iaa_base_elevator")
    await Wait(500);
    await fetchElevators();
    /*setInterval(async () => {
        console.log(await fetchMaxFloorsByStation("motel"));
    }, 2000);*/
    while(true) {
        controls(menu)
        await Wait(1)
    }
})();

const fetchMaxFloorsByStation = async (station) => {
    if(elevators) {
        if(elevators[station]) {
            return Object.keys(elevators[station].floors).length;
        } else {
            return false;
        }
    } else {
        await fetchElevators();
        await Wait(300);
        await fetchMaxFloorsByStation();
    }
}

setTick(async () => {
    let nearStation = await isNearOfAnyElevatorStation();
    if(nearStation) {
        if(debug) log("isNearOfAnyElevatorStation():1 - nearest station found: "+nearStation)
        if(debug) log("elevator floor number: "+await fetchFloorNumberFromCurrentElevatorPosition(nearStation))
        if(debug) log("player floor number: "+await fetchFloorNumberFromCurrentPlayerPosition(nearStation))

        let currentFloor = await fetchFloorNumberFromCurrentElevatorPosition(nearStation);
        await setCurrentStation(nearStation);
        if(currentFloor) {
            setCurrentFloorNumber(currentFloor)
            setUiDisplay(true)
        }
        if(!spawnedElevators[nearStation]) {
            await spawnElevator(nearStation)
        }
    } else {
        if(menu) {
            await handleMenu();
        }
        setUiDisplay(false)
    }
    await Wait(1)
});

RegisterCommand("hes", async (source, args) => {
    const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
    //GetClosestObjectOfType(x, y, z, 30, GetHashKey("prop_test_elevator"), false, false, false);
    let closestObject = GetClosestObjectOfType(x, y, z, 30, GetHashKey("xm_prop_iaa_base_elevator"), false, false, false);
    console.log("closest object: "+closestObject);

    const [mx, my, mz] = GetEntityCoords(closestObject, false);

    let floor = 0.3;

    PlaySoundFrontend(-1, "CLOSED", "MP_PROPERTIES_ELEVATOR_DOORS", 1);
    PlaySoundFrontend(-1, "Hack_Success", "DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS", 0)
    do {
        SlideObject(closestObject, mx, my, mz-floor, 0.1, 0.1, 0.1, false)
        floor = floor + 0.3;
        //console.log("Kat: "+(Math.floor(floor*10*100)/1000))
        await Wait(1);
    } while(floor < Number(args[0]))

    // SlideObject(closestObject, x, y, z+floor, 1, 1, 1, false)

    //SetEntityRotation(closestObject, GetEntityPitch(closestObject), GetEntityRoll(closestObject), item:IndexToItem(index) + .0, 2, true)
})

RegisterNetEvent("fetchElevators")
AddEventHandler("fetchElevators", (elevator, all) => {
    //if(debug) log("fetchElevators():1 - triggered")
    if(elevator) {
        if(all) {
            if(elevators[all]) {
                elevators[all] = elevator
            } else {
                if(!elevators) {
                    elevators = {};
                    elevators[all] = {};
                    elevators[all] = elevator
                } else {
                    elevators[all] = {};
                    elevators[all] = elevator
                }
            }
        } else {
            elevators = elevator
        }
    }
})

RegisterCommand("xas", (source, args) => {
    let [x, y, z] = GetEntityCoords(PlayerPedId(), false);
    let closestElevator = GetClosestObjectOfType(x, y, z, 50, GetHashKey("xm_prop_iaa_base_elevator"), true, false, false);
    console.log(GetEntityCoords(closestElevator, false))
})


RegisterCommand("xar", async (source, args) => {
    /*setInterval(async () => {
        console.log(await isNearOfAnyElevatorStation());
    }, 100)*/
    if(fetchFloorZPosFromFloorNumber(args[0], Number(args[1]))) {
        await moveElevator(args[0], fetchFloorZPosFromFloorNumber(args[0], Number(args[1])), true)
    }

})

RegisterCommand("fetch", async (source, args) => {
    if(args.length > 0) {
        await fetchElevators(args[0]);
        console.log(elevators[args[0]]);
    } else {
        await fetchElevators();
        console.log(elevators);
    }
})