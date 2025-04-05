let responses = [];     // An array containing responses (and player last name if necessary) paired with their respective property

export async function fieldForm(event) {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="fieldOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        responses.push({property: "field", lastName: null, data: selectedOption.value});

        // Go to next step
        document.getElementById('popupField').style.display = 'none';
        document.getElementById('popupHalfScore').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "Field Choice"
        );
    }
}

export async function halfScoreForm(event) {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const watkinsHalf = document.querySelector('input[name="watkinsHalfScore"]').value;
    const opponentHalf = document.querySelector('input[name="opponentHalfScore"]').value;
    responses.push({property: "half score", lastName: null, data: watkinsHalf});
    responses.push({property: "half score opponent", lastName: null, data: opponentHalf});

    // Build form for next step
    let startedForm = document.getElementById("startedForm");
    let innerHTML = '<p>Y/N</p>';
    let firstNames = [];
    let lastNames = [];

    const data = await window.electronAPI.getData("association", {});

    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="startedOption" value="yes' + lastNames[i] + '">';
        innerHTML += '<input type="checkbox" name="startedOption" value="no' + lastNames[i] + '" checked>';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    startedForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupHalfScore').style.display = 'none';
    document.getElementById('popupStarted').style.display = 'block';
}

export async function startedForm(event) {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    let firstNames = [];
    let lastNames = [];
    
    const data = await window.electronAPI.getData("association", {});
    
    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    const startedCheckedBoxes = document.querySelectorAll('input[name="startedOption"]:checked');
    let selectedYes = false;    // "yes" responses take precedent over "no"

    lastNames.forEach(name => {
        startedCheckedBoxes.forEach(checkBox => {
            if (checkBox.value.includes(name)) {
                checkBox.value = checkBox.value.replace(name, "");
                if (!selectedYes){
                    responses.push({property: "started", lastName: name, data: checkBox.value});
                }
                if (checkBox.value === "yes"){
                    selectedYes = true;
                }
            };
        });
        selectedYes = false;
    });

    // Build form for next step
    let motmForm = document.getElementById("motmForm");
    let innerHTML = '';

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="radio" name="motmOption" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    motmForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupStarted').style.display = 'none';
    document.getElementById('popupMOTM').style.display = 'block';
}

export async function motmForm(event) {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="motmOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        responses.push({property: "motm award", lastName: selectedOption.value, data: null});

        // Build form for next step
        let sportsmanForm = document.getElementById("sportsmanForm");
        let innerHTML = '';
        let firstNames = [];
        let lastNames = [];
    
        const data = await window.electronAPI.getData("association", {});
    
        data.recordsets[0].forEach(record => {
            for (const [key, value] of Object.entries(record)) {
                if (key == "first name"){ firstNames.push(value); }
                if (key == "last name"){ lastNames.push(value); }
            }
        });
    
        for (let i = 0; i < firstNames.length; i++){
            innerHTML += '<input type="radio" name="sportsmanOption" value="' + lastNames[i] + '">';
            innerHTML += '<label>';
            innerHTML += "  " + firstNames[i] + " " + lastNames[i];
            innerHTML += '</label><br>';
        }

        innerHTML += '<br><button type="submit">Submit</button>'
        sportsmanForm.innerHTML = innerHTML;

        // Go to next step
        document.getElementById('popupMOTM').style.display = 'none';
        document.getElementById('popupSportsman').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "MOTM Choice"
        );
    }
}

export async function sportsmanForm(event) {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="sportsmanOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        responses.push({property: "sportsmanship award", lastName: selectedOption.value, data: null});

        // Build form for next step
        let shotsGoalForm = document.getElementById("shotsGoalForm");
        let innerHTML = '';
        let firstNames = [];
        let lastNames = [];
    
        const data = await window.electronAPI.getData("association", {});
    
        data.recordsets[0].forEach(record => {
            for (const [key, value] of Object.entries(record)) {
                if (key == "first name"){ firstNames.push(value); }
                if (key == "last name"){ lastNames.push(value); }
            }
        });
    
        for (let i = 0; i < firstNames.length; i++){
            innerHTML += '<label>';
            innerHTML += firstNames[i] + " " + lastNames[i];
            innerHTML += '</label><input type="number" name="shotsGoal' + lastNames[i] + '" value="0" min="0" max="99"><br>';
        }

        innerHTML += '<br><button type="submit">Submit</button>'
        shotsGoalForm.innerHTML = innerHTML;

        // Go to next step
        document.getElementById('popupSportsman').style.display = 'none';
        document.getElementById('popupShotsGoal').style.display = 'block';
    } else {
        window.electronAPI.showPrompt(
            "info",
            "Please select an option.",
            "",
            "Sportsmanship Choice"
        );
    }
}

export async function shotsGoalForm(event) {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    let firstNames = [];
    let lastNames = [];
    
    const data = await window.electronAPI.getData("association", {});
    
    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    let shotsOnGoal;
    lastNames.forEach(name => {
        shotsOnGoal = document.querySelector('input[name="shotsGoal' + name + '"]').value;
        responses.push({property: "shots on goal", lastName: name, data: shotsOnGoal});
    });

    // Build form for next step
    let yellowsForm = document.getElementById("yellowsForm");
    let innerHTML = '';

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="yellows" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    yellowsForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupShotsGoal').style.display = 'none';
    document.getElementById('popupYellows').style.display = 'block';
}

export async function yellowsForm(event) {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const yellowsCheckedBoxes = document.querySelectorAll('input[name="yellows"]:checked');
    if (yellowsCheckedBoxes){
        yellowsCheckedBoxes.forEach(checkBox => {
            responses.push({property: "yellows", lastName: checkBox.value, data: null});
        });
    }

    // Build form for next step
    let redsForm = document.getElementById("redsForm");
    let innerHTML = '';
    let firstNames = [];
    let lastNames = [];

    const data = await window.electronAPI.getData("association", {});

    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    for (let i = 0; i < firstNames.length; i++){
        innerHTML += '<input type="checkbox" name="reds" value="' + lastNames[i] + '">';
        innerHTML += '<label>';
        innerHTML += "  " + firstNames[i] + " " + lastNames[i];
        innerHTML += '</label><br>';
    }

    innerHTML += '<br><button type="submit">Submit</button>'
    redsForm.innerHTML = innerHTML;

    // Go to next step
    document.getElementById('popupYellows').style.display = 'none';
    document.getElementById('popupReds').style.display = 'block';
}

export async function redsForm(event) {
    event.preventDefault();
    // TODO: Add Data to SQL Table
    const redsCheckedBoxes = document.querySelectorAll('input[name="reds"]:checked');
    if (redsCheckedBoxes){
        redsCheckedBoxes.forEach(checkBox => {
            responses.push({property: "reds", lastName: checkBox.value, data: null});
        });
    }
    console.log(responses);

    // Close popup
    document.getElementById('popupReds').style.display = 'none';
}