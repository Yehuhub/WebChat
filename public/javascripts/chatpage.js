(() => {
  "use strict";
  const API_URL = "/api/message";
  const POLLING = 10;

  const APIMODULE = (() => {
    /**
     * Checks the status of the response and returns a promise with the response or an error.
     * @param {Response} response - The response object from the fetch request.
     * @returns {Promise} - A promise with the response object or an error.
     */
    const status = async (response) => {
      if (response.ok) {
        return Promise.resolve(response);
      } else {
        const message = await response.text();
        return Promise.reject({ status: response.status, message });
      }
    };

    /**
     * Fetches data from the specified URL and returns the response as JSON.
     * @param {string} url - The URL to fetch data from.
     * @param {options} url - The data and options for fetch
     * @returns {Promise} - A promise with the response object as JSON.
     */
    const callAPI = async (url, options) => {
      try {
        const response = await fetch(url, options);
        await status(response);
        const asJson = await response.json();
        return asJson;
      } catch (err) {
        throw err;
      }
    };

    /**
     * Object with methods to make GET, POST, DELETE, and PUT requests.
     * @returns {Object} - An object with methods to make GET, POST, DELETE, and PUT requests.
     * @property {Function} get - A function to make a GET request.
     * @property {Function} post - A function to make a POST request.
     * @property {Function} delete - A function to make a DELETE request.
     * @property {Function} put - A function to make a PUT request.
     */
    return {
      get: (url) => callAPI(url, { method: "GET" }),
      post: (url, data) =>
        callAPI(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }),
      delete: (url) => callAPI(url, { method: "DELETE" }),
      put: (url, data) =>
        callAPI(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }),
    };
  })();

  /**
   * Handles errors based on the status code of the error.
   * @param {Object} error - The error object.
   */
  const errorHandler = (error) => {
    const status = error?.status;

    switch (status) {
      case 500:
        window.location.href = "/error";
        break;

      case 404:
        UI.showErrorToast("The requested resource was not found.");
        break;

      case 401:
        window.location.href = "/login";
        break;

      case 400:
        const errorMessage =
          error.response?.data?.message ||
          "Invalid input. Please check your data";
        UI.showErrorToast(errorMessage);
        break;
      default:
        // Fallback for other errors
        UI.showErrorToast("Unexpected error, please try again later.");
        break;
    }
  };

  /**
   * Module with handlers for the different events in the chat page.
   * @returns {Object} - An object with methods to handle different events.
   * @property {Function} deleteButtonHandler - A function to handle the delete button click event.
   * @property {Function} saveEditButtonHandler - A function to handle the save edit button click event.
   * @property {Function} sendMessageHandler - A function to handle the send message form submit event.
   * @property {Function} searchHandler - A function to handle the search form submit event.
   * @property {Function} clearSearch - A function to handle the clear search form reset event.
   */
  const handlers = (() => {
    //get the message id from the element
    const getMessageId = (element) => {
      const li = element.closest("li");
      return li ? li.id.replace("msgId", "") : "";
    };

    return {
      //delete a message
      deleteButtonHandler: async (event) => {
        try {
          const msgId = getMessageId(event.target);
          await APIMODULE.delete(`${API_URL}/${msgId}`);
          await UI.updateMessages();
        } catch (err) {
          errorHandler(err);
        }
      },
      //save the edited message
      saveEditButtonHandler: async (event, li) => {
        event.preventDefault();
        const msgId = getMessageId(li);
        const msgContent = event.target.newContent.value?.trim();
        try {
          const content = await APIMODULE.put(API_URL, {
            messageId: msgId,
            messageContent: msgContent,
          });
          DesignMODULE.returnToMessageView(
            li,
            content.data.content || msgContent,
            content.data.updatedAt
          );
          await UI.updateMessages();
        } catch (err) {
          errorHandler(err);
        }
      },
      //send a message
      sendMessageHandler: async (event) => {
        event.preventDefault();
        const message = event.target.messageInput.value?.trim();
        try {
          await APIMODULE.post(API_URL, { messageContent: message });
          await UI.updateMessages();
          event.target.reset(); //clears the input
          UI.scrollToRecentMessage();
        } catch (err) {
          errorHandler(err);
        }
      },
      //search for messages based on the search string
      searchHandler: async (event) => {
        event.preventDefault();
        const searchString = event.target.searchString.value?.trim();
        try {
          const receivedData = await APIMODULE.get(
            `${API_URL}/search?string=${searchString}`
          );
          UI.renderMessages(receivedData);
          UI.newMessageForm.classList.add("d-none");
        } catch (err) {
          errorHandler(err);
        }
      },
      //clear the search form and show all messages
      clearSearch: async (event) => {
        event.preventDefault();
        event.target.searchString.value = "";
        try {
          const receivedData = await APIMODULE.get(`${API_URL}`);
          UI.renderMessages(receivedData);
          UI.newMessageForm.classList.remove("d-none");
        } catch (err) {
          errorHandler(err);
        }
      },
    };
  })();

  /**
   * Module with methods to create and manipulate the design of the chat page.
   * @returns {Object} - An object with methods to create and manipulate the design of the chat page.
   * @property {Function} messageAsHTMLElement - A function to create a message as an HTML element.
   * @property {Function} returnToMessageView - A function to return to the message view after editing a message.
   * @property {Object} NAMES - An object with the names of the classes used in the design.
   * @property {Function} createButton - A function to create a button element.
   * @property {Function} createDeleteButton - A function to create a delete button element.
   * @property {Function} createEditButton - A function to create an edit button element.
   * @property {Function} editButtonHandler - A function to handle the edit button click event.
   */
  const DesignMODULE = (() => {
    const NAMES = {
      headerDiv: "header-div",
      dateSpan: "date-span",
      bodyDiv: "body-div",
      messageSpan: "message-span",
      buttonsDiv: "buttons-div",
    };

    //create a message as an HTML element with the user's name, message, and date
    const messageAsHTMLElement = (message) => {
      const li = document.createElement("li");
      const headerDiv = document.createElement("div");
      const bodyDiv = document.createElement("div");

      const messageSpan = document.createElement("span");

      li.className =
        "d-flex flex-column p-3 border border-2 rounded m-1 bg-success-subtle";
      li.id = `msgId${message.id}`;

      headerDiv.className = `${NAMES.headerDiv} d-flex justify-content-between align-items-center mb-2`;
      headerDiv.innerHTML = `<span class="fw-bold">${
        message.user.firstName + " " + message.user.lastName
      }</span>
          <span class="${NAMES.dateSpan} text-muted small">${new Date(
        message.updatedAt
      ).toLocaleString("en-GB")}</span>`;

      bodyDiv.className = `${NAMES.bodyDiv} d-flex justify-content-between align-items-center w-100`;
      messageSpan.className = `${NAMES.messageSpan} text-break`;
      messageSpan.textContent = message.content;

      bodyDiv.appendChild(messageSpan);
      li.appendChild(headerDiv);
      li.appendChild(bodyDiv);

      if (UI.isSameUser(message.userId)) {
        const buttonsDiv = document.createElement("div");
        buttonsDiv.className = NAMES.buttonsDiv;
        buttonsDiv.appendChild(createEditButton());
        buttonsDiv.appendChild(createDeleteButton());
        bodyDiv.appendChild(buttonsDiv);
      }

      return li;
    };

    //create a button element
    const createButton = (type, imgSrc, handler) => {
      const button = document.createElement("button");
      const img = document.createElement("img");

      button.className = `btn btn-sm btn-outline-${type}`;
      img.src = imgSrc;
      img.style.height = "15px";

      button.appendChild(img);
      button.addEventListener("click", handler);
      return button;
    };

    //create a delete button
    const createDeleteButton = () =>
      createButton(
        "danger",
        "/images/delete.png",
        handlers.deleteButtonHandler
      );
    //create an edit button
    const createEditButton = () =>
      createButton("secondary", "/images/edit.png", editButtonHandler);

    //handle the edit button click event to edit a message
    const editButtonHandler = (event) => {
      const li = event.target.closest("li");
      const bodyDiv = event.target.closest(`.${NAMES.bodyDiv}`);
      const messageSpan = bodyDiv.querySelector("span");
      const newBodyDiv = document.createElement("div");

      const form = document.createElement("form");
      const input = document.createElement("input");
      const saveButton = document.createElement("button");
      const cancelButton = document.createElement("button");

      newBodyDiv.className = `${NAMES.bodyDiv} d-flex justify-content-between align-items-center w-100`; //need to make it nice

      input.type = "text";
      input.value = messageSpan.textContent;
      input.className = "form-control form-control-sm me-2";
      input.id = "newContent";
      input.required = true;

      saveButton.className = "btn btn-sm btn-outline-primary me-2 ";
      saveButton.type = "submit";
      saveButton.textContent = "Save";

      cancelButton.className = "btn btn-sm btn-outline-secondary me-2 ";
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";

      form.appendChild(input);
      form.appendChild(saveButton);
      form.appendChild(cancelButton);
      newBodyDiv.appendChild(form);
      bodyDiv.replaceWith(newBodyDiv);

      cancelButton.addEventListener("click", () => {
        newBodyDiv.replaceWith(bodyDiv);
      });

      form.addEventListener("submit", (event) =>
        handlers.saveEditButtonHandler(event, li)
      );
    };

    //return to the message view after editing a message
    const returnToMessageView = (li, receivedContent, updatedAt) => {
      const messageSpan = document.createElement("span");
      const buttonsDiv = document.createElement("div");
      const body = li.querySelector(`.${NAMES.bodyDiv}`);
      body.innerHTML = "";

      //update date and time
      li.querySelector(`.${NAMES.dateSpan}`).textContent = new Date(
        updatedAt
      ).toLocaleString("en-GB");

      messageSpan.className = `${NAMES.messageSpan} text-break`;
      messageSpan.textContent = receivedContent;

      buttonsDiv.className = `${NAMES.buttonsDiv}`;
      buttonsDiv.appendChild(createEditButton());
      buttonsDiv.appendChild(createDeleteButton());
      body.appendChild(messageSpan);
      body.appendChild(buttonsDiv);
    };

    return {
      messageAsHTMLElement,
      returnToMessageView,
      NAMES,
    };
  })();

  /**
   * Module with methods to handle the user interface of the chat page.
   * @returns {Object} - An object with methods to handle the user interface of the chat page.
   * @property {Function} init - A function to initialize the chat page.
   * @property {Function} updateMessages - A function to update the messages in the chat.
   * @property {Function} scrollToRecentMessage - A function to scroll to the most recent message.
   * @property {Function} isSameUser - A function to check if the user is the same as the message user.
   * @property {Function} renderMessages - A function to render the messages in the chat.
   * @property {Object} newMessageForm - The form to send a new message.
   * @property {Function} showErrorToast - A function to show an error toast message.
   */
  const UI = (() => {
    const userId = document.getElementById("userId").value;
    const messageList = document.getElementById("messageList");
    const newMessageForm = document.getElementById("newMessageForm");
    const lastFetchDate = new Date();
    const toastMessage = document.getElementById("toastMessage");
    const toastContainer = document.getElementById("toastContainer");
    const toastEl = document.getElementById("notificationToast");

    //render the messages in the chat page based on the data received
    const renderMessages = (messages, update = false) => {
      lastFetchDate.setTime(Date.now());
      if (update) {
        const fragment = document.createDocumentFragment();
        messages.data.messages.forEach((message) => {
          const messageElement = document.getElementById(`msgId${message.id}`);
          switch (message.status) {
            case "deleted":
              if (!messageElement) return;
              messageElement?.remove();
              break;
            case "updated":
              if (!messageElement) return;
              messageElement.querySelector(
                `.${DesignMODULE.NAMES.messageSpan}`
              ).textContent = message.content;
              break;
            case "new":
              fragment.appendChild(DesignMODULE.messageAsHTMLElement(message));
              break;
          }
        });
        if (fragment.childElementCount) {
          messageList.appendChild(fragment);
        }
      } else {
        const elements = messages.data.messages.map((message) => {
          return DesignMODULE.messageAsHTMLElement(message);
        });
        messageList.innerHTML = "";
        messageList.append(...elements);
        UI.scrollToRecentMessage();
      }
    };

    //show a toast message with an error
    const showErrorToast = (message) => {
      toastMessage.innerHTML = message;

      toastContainer.style.display = "block";

      const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
      toast._config.delay = 1500;
      toast.show();
    };

    return {
      //initialize the chat page and set up event listeners
      init: async (event) => {
        const form = document.getElementById("searchForm");
        form.addEventListener("submit", handlers.searchHandler);
        form.addEventListener("reset", handlers.clearSearch);
        document
          .getElementById("newMessageForm")
          .addEventListener("submit", handlers.sendMessageHandler);

        try {
          const initMessages = await APIMODULE.get(API_URL);
          renderMessages(initMessages);
          setInterval(UI.updateMessages, POLLING * 1000);
        } catch (err) {
          errorHandler(err);
        }
      },
      //update the messages in the chat page by fetching the latest messages
      updateMessages: async () => {
        try {
          const receivedData = await APIMODULE.get(
            `${API_URL}/date?lastFetchTimeStamp=${lastFetchDate.toISOString()}`
          );
          lastFetchDate.setTime(Date.now());

          renderMessages(receivedData, true);
        } catch (err) {
          errorHandler(err);
        }
      },
      scrollToRecentMessage: () => {
        messageList.lastElementChild?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      },
      isSameUser: (id) => Number(userId) === id,
      renderMessages,
      newMessageForm,
      showErrorToast,
    };
  })();

  document.addEventListener("DOMContentLoaded", UI.init);
})();
