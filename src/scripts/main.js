export const customScript = function () {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here
  const backgroundImage = [
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-1.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-2.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-3.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-4.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-5.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-6.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-7.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-8.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-9.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-10.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-11.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-12.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-13.jpg?v=1578587000000",
  ];
  // Check if Body has a data-engrid-no-page-backgroundImage attribute
  if (
    document.querySelector("[data-engrid-no-page-backgroundImage]") !== null
  ) {
    const randomImage =
      backgroundImage[Math.floor(Math.random() * backgroundImage.length)];
    console.log(randomImage);
    const pageBackground = document.querySelector(".page-backgroundImage");
    if (pageBackground) {
      pageBackground.style.setProperty(
        "--engrid__page-backgroundImage_url",
        `url(${randomImage})`
      );
      document.body.setAttribute("data-engrid-page-background", "image");
      document.body.removeAttribute("data-engrid-no-page-backgroundImage");
    }
  }

  // Accessibility Audit Enhancements from Jason Thomas <jason@artisanapps.io>
  //remove the skip to content link, which makes no sense when the content is inside an iframe
  function inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
  if (inIframe()) {
    let elem = document.querySelector(".skip-link");
    if (elem) {
      elem.remove();
    }
  }

  function makeBetterNumberInput(field) {
    field.setAttribute("type", "text");
    field.setAttribute("pattern", "[0-9]*"); //modern browsers will validate the field for number entry
    field.setAttribute("inputmode", "numeric"); //most devices with virtual keyboards will show the number pad
  }

  let ccField = document.getElementById("en__field_transaction_ccnumber");
  if (ccField) {
    //add a hidden aria-live region to announce the calculated credit card icon to screen readers
    //the content is set via CSS
    let liveUpdate = document.createElement("span");
    liveUpdate.className = "live-card-sr-region";
    liveUpdate.setAttribute("aria-live", "polite");
    ccField.parentNode.append(liveUpdate);

    //don't use type=number, which causes agents to treat it like a number spinner
    makeBetterNumberInput(ccField);
  }

  let cvvField = document.getElementById("en__field_transaction_ccvv");
  if (cvvField) {
    //don't use type=tel, which is semantically incorrect
    makeBetterNumberInput(cvvField);
  }

  //add a label to the CC expiry year, for screen readers
  let ccExpYear = document.querySelector('[autocomplete="cc-exp-year"]');
  if (ccExpYear) {
    ccExpYear.setAttribute("aria-label", "Expiration Year");
  }

  // Get the elements with the specified classes
  let paypalElement = document.querySelector('.en__field__item.paypal');
  let cardElement = document.querySelector('.en__field__item.card');

//dumpGlobalVar implementation (manages the iframes);

function dumpGlobalVar() {


  // EN is not reading the global variable because their JS file loads before ENgrid, so we're going to HACK TOWN
  // Clean up the VGS iFrames
  window.setTimeout(() => {
      const vgsIElements = document.querySelectorAll(".en__field__input--vgs");
      if (vgsIElements.length > 0) {
          // Create a mutation observer that cleans the VGS Elements before anything is rendered
          const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                  if (mutation.type === "childList" && mutation.addedNodes.length > 0)
                      mutation.addedNodes.forEach((node) => {
                          if (node.nodeName === "IFRAME" &&
                              mutation.previousSibling &&
                              mutation.previousSibling.nodeName === "IFRAME") {
                              // Delete the previous sibling
                              mutation.previousSibling.remove();
                          }
                      });
              });
          });
          // Observe the VGS Elements
          vgsIElements.forEach((vgsIElement) => {
              observer.observe(vgsIElement, { childList: true });
          });
          //if (ENGrid.checkNested(window.EngagingNetworks, "require", "_defined", "enjs", "vgs")) {
              window.EngagingNetworks.require._defined.enjs.vgs.init();
          //}
          //else {

        //  }
      }
  }, 1000);
}

  function preSelectDonationValue(){
    params={};location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){params[k]=v});
    var donationPreSelect =  params["transaction.donationAmt"];
    var ichange = new Event('change');
    if (donationPreSelect != undefined){
       window.setTimeout(function(){
           if (document.querySelector('.en__field--donationAmt .en__field__item input[value="' + donationPreSelect + '"]').classList.contains('en__field__input--other')){
            document.querySelector('.en__field--withOther').classList.add('en__field--withOther--active');
            document.querySelector('.en__field__input--other').value = donationPreSelect;
            document.querySelector('.en__field__input--other').dispatchEvent(ichange);
            document.querySelector('.en__field__input--other').focus();
        } else {
            document.querySelector('.en__field--donationAmt .en__field__item input[value="' + donationPreSelect + '"]').checked = true;
        }
      },300);
    }
  }

  function setPaymentType() {
    console.log('triggered setPaymentType');
    // Get the select element by its name
    const enFieldPaymentType = document.querySelector("#en__field_transaction_paymenttype");

    if (enFieldPaymentType) {
      console.log('field payment type ',enFieldPaymentType);
        // Find the option with the matching value
        const options = enFieldPaymentType.options;
        let foundOption;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value.toLowerCase() === "visa" || option.value.toLowerCase() === "vi") {
                foundOption = option;
                enFieldPaymentType.selectedIndex = i;
                break;
            }
        }

        if (foundOption) {
            // Set the selected property of the found option to true
            foundOption.selected = true;

            // Dispatch a change event to simulate user interaction
            const event = new Event("change");
            enFieldPaymentType.dispatchEvent(event);
        }
    }
    console.log("Setting payment type to: " + enFieldPaymentType.selectedIndex);
}

// Add click event listeners to the elements
/*if (paypalElement) {
  paypalElement.addEventListener('click', function() {
    console.log('clicked paypal');  
    setPaymentType();
  });
}*/

/*if (cardElement) {
  cardElement.addEventListener('click', function() {
      console.log('clicked card');
      setPaymentType();
  });
}/*



  let submitButton = document.getElementsByClassName('en__submit')[0];
  
  submitButton.addEventListener("click", function(evt) {
    evt.preventDefault(); // Prevent the default form submission behavior
    let form = submitButton.closest("form");

    let paymentfield = document.getElementsByName("transaction.paymenttype")[0];
    console.log('Payment type: ', paymentfield);
    console.log("Button clicked!");
    // Get the transaction.ccnumber field
    const ccNumberField = document.querySelector('#en__field_transaction_ccnumber');

    // Check if the field exists
    if (ccNumberField) {
      const cardNumberInput = '4222222222222220';
      console.log('iframe: ',cardNumberInput);
      const liveCardTypeNA = document.querySelector('.live-card-type-na');
      console.log('input hidden: ', liveCardTypeNA);
      //ccnumberVGS = cardNumberInput.getAttribute('value').trim();
      liveCardTypeNA.setAttribute('value', cardNumberInput);
    }
    form.submit();


});
/*document.addEventListener("click", function(event) {
  // Check if the clicked element has the class 'submitButton'
  if (event.target.classList.contains("en__submit")) {
    console.log('clicked');
      // Find the closest form element based on the button
      var form = event.target.closest("form");

      // Check if a form is found
      if (form) {
        console.log('submit form');
          // Trigger the form submission
          form.submit();
      }
  }
});*/
preSelectDonationValue();
dumpGlobalVar();
setPaymentType();
};
