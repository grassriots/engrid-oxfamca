import { initImpactAmounts } from "./impact-amounts";

export const customScript = function () {
  console.log("ENGrid client scripts are executing");

  // Grassriots - fix for making the credit card and CVV fields mandatory but still be able to make Payal donations
  var paypalbutton = document.getElementsByClassName("en__field__item paypal");
      if (paypalbutton.length != 0) {

  var addCVVNumbers = function() {
      document.getElementById("en__field_transaction_ccnumber").value = "0000000000000000";
      document.getElementById("en__field_transaction_ccvv").value = "000";
  };

  paypalbutton[0].addEventListener('click', addCVVNumbers, false);

  var cardbutton = document.getElementsByClassName("en__field__item card");

  var removeCVVNumbers = function() {
      document.getElementById("en__field_transaction_ccnumber").value = "";
      document.getElementById("en__field_transaction_ccvv").value = "";
  };

  cardbutton[0].addEventListener('click', removeCVVNumbers, false);
      }
  // Add your client scripts here
  /*const backgroundImage = [
    //"https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/Shortfall+Campaign+-+Donation+Page+-+Plain+Background.png?v=1709580281000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/Shortfall+Campaign+-+Donation+Page+-+Plain+Background.jpg?v=1709580270000"
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
  }*/

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

  function preSelectDonationValue() {
    var params = {}; location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (s, k, v) { params[k] = v });
    var donationPreSelect = params["transaction.donationAmt"];
    if (donationPreSelect != undefined) {
      setSelectedAmount(donationPreSelect);
    }

    //Set other Placeholder

    let other = document.querySelector("[name='transaction.donationAmt.other']");
    if (other) { // always good to check it exists
        other.placeholder = "Other";
    }
  }

  function setSelectedAmount(amount) {
    var ichange = new Event('change');
    window.setTimeout(function () {
      if (document.querySelector('.en__field--donationAmt .en__field__item input[value="' + amount + '"]').classList.contains('en__field__input--other')) {
        document.querySelector('.en__field--withOther').classList.add('en__field--withOther--active');
        document.querySelector('.en__field__input--other').value = amount;
        document.querySelector('.en__field__input--other').dispatchEvent(ichange);
        document.querySelector('.en__field__input--other').focus();
      } else {
        document.querySelector('.en__field--donationAmt .en__field__item input[value="' + amount + '"]').checked = true;
        if(document.querySelector('.en__field--withOther').classList.contains('en__field--withOther--active')){
          document.querySelector('.en__field--withOther').classList.remove('en__field--withOther--active');
          document.querySelector('.en__field__input--other').value = null;
        }
      }
      updateSubmitButton();
    }, 300);
    
  }

  function setPaymentType() {
    console.log('triggered setPaymentType');
    // Get the select element by its name
    const enFieldPaymentType = document.querySelector("#en__field_transaction_paymenttype");

    if (enFieldPaymentType) {
      console.log('field payment type ', enFieldPaymentType);
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

  //Workaround for gift swap list

  let defaultCheckedDonationButton;
  let defaultCheckedDonationButtonValue;
  let defaultCheckedFrequency;
  let submitLabel;
  let upsellLabel;

  function checkDefaultValues() {
    console.log('triggered checkdefaultvalue()');
    defaultCheckedDonationButton = document.querySelector('[name="transaction.donationAmt"]:checked');
    if (defaultCheckedDonationButton) {
      defaultCheckedDonationButtonValue = defaultCheckedDonationButton.value;
      console.log('Default donation value:', defaultCheckedDonationButtonValue);
    }
  }

  function checkDefaultFrequency() {
    console.log('triggered checkDefaultFrequency()');
    defaultCheckedFrequency = document.querySelector('[name="transaction.recurrfreq"]:checked');
    
    if (!defaultCheckedFrequency) {
      console.log('No default frequency found');
      return null;
    }
    
    console.log('Default frequency:', defaultCheckedFrequency.value);
    return defaultCheckedFrequency;
  }

 function setupFrequencyChangeListener() {
  if (!defaultCheckedFrequency) {
    console.log('No frequency element to add listener to');
    return;
  }

  defaultCheckedFrequency.addEventListener('change', function() {
    console.log('Frequency changed');
    
    let currentlySelectedButton = document.querySelector('[name="transaction.donationAmt"]:checked');
    
    if (!currentlySelectedButton || !defaultCheckedDonationButtonValue) {
      console.log('Missing required elements for frequency change handler');
      return;
    }
    
    console.log('Currently selected amount:', currentlySelectedButton.value);
    console.log('Default amount:', defaultCheckedDonationButtonValue);
    
    if (currentlySelectedButton.value !== defaultCheckedDonationButtonValue) {
      setSelectedAmount(defaultCheckedDonationButtonValue);
    }
  });
}

//lazy loading for footer

function setLazyLoading(){
  const footerImg = document.querySelectorAll('a.footer-logo');
  footerImg.forEach(function(footerImg) {
    // Check if the <a> element contains an <img> tag
    var imgElement = footerImg.querySelector('img');
    
    // If an <img> tag is found within the <a> element, do something
    if (imgElement) {
       imgElement.setAttribute("loading","lazy");
    }
  });
}

  function updateSubmitButton(){
    //console.log('triggered updateSubmitButton');
    submitLabel = document.querySelector('.en__submit button .live-variable-amount');
    console.log(submitLabel);
    //console.log(defaultCheckedDonationButtonValue);
    submitLabel.innerText = `${defaultCheckedDonationButtonValue}`;
  }

  function updateUpsellButton(){
    //console.log('triggered updateUpsell')
    upsellLabel = document.querySelector('.upsell_amount');
    window.setTimeout(function(){
      upsellLabel.innerText = `$${defaultCheckedDonationButtonValue}`;
    },500)
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

  /*
  // Thank you page function
  Looks for a special component on the thank you page. 
  uses data definied in the component to geenrate an interface to choose a donation amount and forward to a donation page with prefilled information.
  Defaults:
  donationOptions= {
        form: 'https://secured.oxfam.ca/page/164472/donate/1', //form link 
        amounts: [50, 100, 500], //Amounts
        heading:"Donate to Oxfam to support the people of Gaza", //Heading
        textContent: "", //optional text contentbelow heading
        colourTheme: "#64ae3c" //Button, heading and input colour theme.
    }
        Outputs:
        <div class="thankYouDonation">
          <div class="thankYouDonation__header">
              <h1>&nbsp;</h1>
          </div>
          <div class="thankYouDonation__text">
              <p>&nbsp;</p>
          </div>
        <div class="thankYouDonation--form">
            <div class="thankYouDonation--inputs">
                <input type="radio" id="donationArray" value="50" name="" />
                <input type="radio" id="donationArray" value="100" name="" />
                <input type="radio" id="donationArray" value="500" name="" />
            </div>
            <div class="thankYouDonation--other">
                <input type="text" id="other" value="" placeholder="other" />
            </div>
            <a href="#" target="blank">Submit</a>
        </div>
      </div>
  */
function setUpTrucks(){
        let thermometers = document.querySelectorAll('.enWidget--thermometer');
        console.log("Thermometers: " + thermometers.length)

    if (!thermometers.length)
        return false;
    thermometers.forEach((thermometer) => {
      let truckCopy = document.querySelector(".enWidget__copy p")?.innerHTML || "";
      let truckTotal = document.querySelector(".enWidget__total").innerHTML;
      let truckFill = document.querySelector(".enWidget__thermFill").style.height;
      console.log("fill width: " + truckFill);

      // Parse the percentage value from the string (e.g., "45%" -> 45)
      let truckFillPercent = parseInt(truckFill.replace('%', ''));
      console.log("fill percentage: " + truckFillPercent);
      let truckThermometer = `<div class="truck__thermometer">                      
                            <div class="truckGoal">
                                ${truckCopy}
                            </div>
                            <div class="truckBar">
                              <div class="truckFill" style="width:0%;"></div>
                               <div class="truckMarker${truckFillPercent > 33 ? ' active' : ''} truckMarker1"></div>
                              <div class="truckMarker${truckFillPercent > 66 ? ' active' : ''} truckMarker2"></div>
                              <div class="truckMarker${truckFillPercent > 99 ? ' active' : ''} truckMarker3"></div>
                            </div>
                            
                        </div>`;
                        //append the truck thermometer to the thermometer widget
      thermometer.innerHTML = truckThermometer;
      //Animate the bar fill
      let truckFillBar = thermometer.querySelector(".truckFill");
        truckFillBar.style.width = truckFill;
    });
}

function thankYouDonation() {
  // TO DO - allow multiple instances on a page.
  console.log('triggered thankYouDonation()');
  const thankYouComponent = document.querySelector('[data-thank-you-donation]');
  
  if (!thankYouComponent) {
    return; // Exit if component not found
  }

  // Default configuration
  const defaults = {
    form: 'https://secured.oxfam.ca/page/164472/donate/1',
    amounts: [50, 100, 500],
    heading: "Donate to Oxfam to support the people of Gaza",
    customTextContent: "",
    colourTheme: "#64ae3c"
  };

  // Parse data attributes from component, fallback to defaults
  const config = {
    form: (window.donationOptions && window.donationOptions.form) || defaults.form,
    amounts: (window.donationOptions && window.donationOptions.amounts) || defaults.amounts,
    heading: (window.donationOptions && window.donationOptions.heading) || defaults.heading,
    customTextContent: (window.donationOptions && window.donationOptions.customTextContent) || defaults.customTextContent,
    colourTheme: (window.donationOptions && window.donationOptions.colourTheme) || defaults.colourTheme
  };

  // Create the donation interface HTML
  const donationHTML = `
    <div class="thankYouDonation">
      <div class="thankYouDonation__header">
        <h1 style="background-color: ${config.colourTheme}">${config.heading}</h1>
      </div>
      <div class="thankYouDonation__text">
      ${config.customTextContent ? `<div class="thankYouDonation__text">
        <p>${config.customTextContent}</p>
      </div>` : ''}
      </div>
      <div class="thankYouDonation--form">
        <div class="thankYouDonation--inputs">
          ${config.amounts.map((amount, index) => 
            `<label style="border-color: ${config.colourTheme}">
              <input type="radio" name="donationAmount" value="${amount}" ${index === 0 ? 'checked' : ''} />
             <span style="color:${config.colourTheme};">$${amount}</span>
            </label>`
          ).join('')}
        </div>
        <div class="thankYouDonation--other">
          <input type="text" id="otherAmount" placeholder="Other amount"  />
        </div>
        <div class="thankYouDonation--submit_wrapper">
            <a href="#" class="thankYouDonation--submit" style="background-color: ${config.colourTheme}" target="_blank">Donate</a>
            </div>
      </div>
    </div>
    <style>
          .thankYouDonation--inputs label:hover span, .thankYouDonation--inputs label:active span, .thankYouDonation--inputs label:focus-within span{
          color: #ffffff !important;
          background-color: ${config.colourTheme};
          }
          
          .thankYouDonation--inputs label input:checked ~span{
          color: #ffffff !important;
          background-color: ${config.colourTheme};
          }
          
        .thankYouDonation--submit:hover, .thankYouDonation--submit:focus {
            color: #fff;
            background-color: ${config.colourTheme};
          }
        }
    </style>
  `;

  // Replace the component with the generated interface
  thankYouComponent.innerHTML = donationHTML;
  
  // Add event listeners
  const submitButton = thankYouComponent.querySelector('.thankYouDonation--submit');
  const radioButtons = thankYouComponent.querySelectorAll('input[name="donationAmount"]');
  const otherInput = thankYouComponent.querySelector('#otherAmount');

  // Handle other amount input
  otherInput.addEventListener('input', function() {
    radioButtons.forEach(radio => radio.checked = false);
  });

  // Handle radio button selection
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        otherInput.value = '';
      }
    });
  });

  // Handle form submission
  submitButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    let selectedAmount;
    const checkedRadio = thankYouComponent.querySelector('input[name="donationAmount"]:checked');
    
    if (checkedRadio) {
      selectedAmount = checkedRadio.value;
    } else if (otherInput.value && !isNaN(otherInput.value)) {
      selectedAmount = otherInput.value;
    } else {
      alert('Please select or enter a donation amount');
      return;
    }

    // Build the donation URL with prefilled amount
    // Check if URL already has query parameters
    const separator = config.form.includes('?') ? '&' : '?';
    const donationUrl = `${config.form}${separator}transaction.donationAmt=${selectedAmount}&chain`;
    window.open(donationUrl, '_blank');
  });
}




if (window.pageJson.pageNumber == window.pageJson.pageCount) {
//thank you page function
  thankYouDonation();
}else{
  //Payment Page functions
  console.log('On payment page - executing payment functions');
  preSelectDonationValue();
  initImpactAmounts();
  checkDefaultValues();
  checkDefaultFrequency();
  setupFrequencyChangeListener();
  dumpGlobalVar();
  setPaymentType();
  setLazyLoading();
}






};

