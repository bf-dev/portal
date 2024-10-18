(function () {
    const toggleCheckbox = document.getElementById("toggle-custom-code");
    const customCodeContainer = document.getElementById(
        "custom-code-container",
    );
    const customCodeInput = document.getElementById("customCode");

    toggleCheckbox.addEventListener("change", function () {
        if (this.checked) {
            customCodeContainer.style.display = "block";
            customCodeInput.disabled = false;
        } else {
            customCodeContainer.style.display = "none";
            customCodeInput.disabled = true;
            customCodeInput.value = "";
        }
    });
})();
