export async function fieldForm(event) {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="fieldOption"]:checked');
    if (selectedOption) {
        // TODO: Add Data to SQL Table
        let fieldChoice = selectedOption.value;
        console.log(fieldChoice);

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
    console.log(watkinsHalf + "-" + opponentHalf);

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
    const startedCheckedBoxes = document.querySelectorAll('input[name="startedOption"]:checked');
    let checkedBoxesArr = [];
    startedCheckedBoxes.forEach(checkBox => {
        checkedBoxesArr.push(checkBox.value);
        console.log(checkBox.value);
    });

    // Build form for next step
    let motmForm = document.getElementById("motmForm");
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
        let motmWinner = selectedOption.value;
        console.log(motmWinner);

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
        let sportsmanWinner = selectedOption.value;
        console.log(sportsmanWinner);

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
    let shotsGoalArr = [];
    
    const data = await window.electronAPI.getData("association", {});
    
    data.recordsets[0].forEach(record => {
        for (const [key, value] of Object.entries(record)) {
            if (key == "first name"){ firstNames.push(value); }
            if (key == "last name"){ lastNames.push(value); }
        }
    });

    lastNames.forEach(name => {
        shotsGoalArr.push(document.querySelector('input[name="shotsGoal' + name + '"]').value);
        console.log(name + ": " + document.querySelector('input[name="shotsGoal' + name + '"]').value);
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
        let checkedBoxesArr = [];
        yellowsCheckedBoxes.forEach(checkBox => {
            checkedBoxesArr.push(checkBox.value);
            console.log(checkBox.value);
        });
    } else {
        console.log("No yellows selected");
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
        let checkedBoxesArr = [];
        redsCheckedBoxes.forEach(checkBox => {
            checkedBoxesArr.push(checkBox.value);
            console.log(checkBox.value);
        });
    } else {
        console.log("No yellows selected");
    }

    // Close popup
    document.getElementById('popupReds').style.display = 'none';
}