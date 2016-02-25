var addressValidator = require('address-validator');
var Address = addressValidator.Address;
var _ = require('underscore');
var Promise = require('bluebird');

var Zillow = require('node-zillow');
var zillow = new Zillow(process.env.ZWSID);

var amortize = require('amortize');

var validateAddress = Promise.promisify(addressValidator.validate);

var propertyEvaluator = {
  getPropertyInfo: function(address) {
    return validateAddress(address, addressValidator.match.streetAddress)
      .then(function(addressList) {
        if (!addressList.length) { throw "No Address Matches Found." }

        var address = addressList[0];
        return zillow.callApi('GetDeepSearchResults', {
          address: address.streetNumber + " " + address.street,
          citystatezip: address.city + " " + address.state + " " + address.postalCode,
          rentzestimate: true
        });
      })
      .then(function(res) {
        var data = res.response[0].results[0].result[0];
        // return data;
        return {
          zestimate: data.zestimate[0].amount[0]._,
          rentzestimate: data.rentzestimate[0].amount[0]._,
          zpid: data.zpid[0],
          taxAssessment: data.taxAssessment[0]
        }
      })
      .then(function(data) {
        return propertyEvaluator.evaluateCashFlow(data);
      });
  },

  evaluateCashFlow: function(data, price) {
    if (!price) { price = data.zestimate; }
    var rent = data.rentzestimate;

    var mortgageInfo = amortize({
      amount: price,
      rate: 4.625,
      totalTerm: 360,
      amortizeTerm: 12
    });

    var mortgage = Math.round(mortgageInfo.paymentRound);
    var taxes = Math.round(data.taxAssessment * 0.02 / 12);
    var insurance = Math.round(0.0004 * data.taxAssessment);
    var management = Math.round(1.7/12 * rent);
    var repairs = Math.round(0.1 * rent);
    var capEx = Math.round(200);
    var vacancy = Math.round(rent / 13);

    var totalCosts = mortgage + taxes + insurance + management + repairs + capEx + vacancy;
    var profit = rent - totalCosts;
    // returns include equity, appreciation, profit
    var returns = mortgageInfo.principalRound / 12 +
                  profit +
                  (data.taxAssessment * .02 / 12);
    var investment = price * 0.2;

    return {
      revenue: rent,
      expenses: totalCosts,
      profit: profit,
      returns: returns,
      investment: investment,
      expenseList: {
        mortgage: mortgage,
        taxes: taxes,
        insurance: insurance,
        management: management,
        repairs: repairs,
        capEx: capEx,
        vacancy: vacancy
      },
      ROI: {
        cacROI: profit * 12 / investment,
        ROI: returns / investment
      },
      assumptions: [
        "Vacancy rate is 7.7%",
        "Tax rate is 2.0%",
        "20% down payment",
        "4.625% interest rate",
        "capEx is $200/month",
        "repairs are 10% of monthly rent",
        "property management is 50% first month's rent + 10%/month",
        "insurance is roughly 0.0004 * tax assessment"
      ]
    };
    /*
    Revenue:
    - Rent: rentZestimate
    Expenses:
    - Mortgage: calculation, need price
    - Taxes: Taxable value (zillow), tax rate?
    - Insurance: Guess .0004 * taxable value
    - HOA: Guess? zillow?
    - Property Management: 50% 1st month + 10%
    - Repair: % of rent
    - CapEx: 200-ish
    */
    return true;
  }
};

module.exports = propertyEvaluator