"use strict";

// Stop user from accidentally deleting a todo
document.addEventListener("DOMContentLoaded", function () {
  let forms = document.querySelectorAll("button.delete, button.edit-image-buttons.delete");
  forms.forEach(form => {
    form.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (confirm("Are you sure? This cannot be undone!")) {
        let form = event.target.closest('form');
        if (form) form.submit();
      }
    });
  });
});

// Give user a menu toogle-able menu to navigate app
const sidebarButton = document.getElementById('sidebar-button');
const sidebarContainer = document.getElementById('sidebar-container');

sidebarButton.addEventListener('click', function() {
  sidebarContainer.classList.toggle('show');
});