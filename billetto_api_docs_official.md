8/14/25, 7:11 AM Overview 

    
    Documentation 

Overview 

Overview  

This page will help you get started with Billetto. You'll be up and 

running in a jiffy\! 

API Endpoints 

To see each API endpoint, an example query and response and objects, see here Basics 

Clients that include the JSON API media type in their Accept \-header MUST specify the media type there at least once without any media type parameters. 

Clients MUST ignore any parameters for the application/vnd.api+json media type received in the Content-Type \-header of response documents. 

All dates and times are in the UTC timezone. 

All proper formed responses will include a meta \-object, with a request\_time \-string that specifies when the request was made, like so: 

format.json 

{ 

 "data": "(...)", 

 "meta": { 

 "request\_time": "2016-09-23T19:00:15.744Z" 

 } 

} 

Supplying the API-Key 

The api-key is either supplied with an parameter, so it looks like this: 

curl\_example\_parameter.sh 

curl \-X "GET" "https://billetto.dk/api/v3/organizer/events?Api 

Keypair=1112K1D9EYDBZ11111M3E8H8L:1S38GVY3r7NoYhmfsSYz353DP1lp83Rv93K3e3tD0oKBh8 https://api.billetto.com/docs/organiser-api 1/2  
8/14/25, 7:11 AM Overview 

Or you can use a header, which is the recommended way, like this: 

curl\_example\_header.rb 

curl \-X "GET" "https://billetto.dk/api/v3/organizer/events" \\ 

 \-H "Api-Keypair: 

1112K1D9EYDBZ11111M3E8H8L:1S38GVY3r7NoYhmfsSYz353DP1lp83Rv93K3e3tD0oKBh88G81" 

Scopes 

Authorization Scopes 

Authorization scopes are a way to determine to what extent the client can use resources located in the provider. 

When the client requests the authorization it specifies in which scope they would like to be authorized. This information is then displayed to the user and they can decide whether or not they accept the given application to be able to act in specified scopes. 

Available scopes 

webhooks : manage (create/read/update/delete) webhooks 

read\_profile : read your public profile details 

Organisation Scope 

The API lives at https://:domain/api/v3/\* where :domain is the Billetto organisation you want information about, e.g. billetto.dk or billetto.se. All content is scoped under the organisation, so data wouldn't leak from one organisation to another. 

    
Updated over 4 years ago 

  OAuth 2.0 Rate limiting   https://api.billetto.com/docs/organiser-api 2/2  
8/14/25, 7:15 AM Address 

    
    API endpoints 

Address 

Address 

The address resource contains the customer address that can be linked to the Order resource. 

The Address object 

| id  | string  | The unique Address identifier. |
| ----- | ----- | :---- |
| object  | string  | The address object type, set to "address" |
| type  | enum | The address type, one of:  \- personal: for personal addresses  \- company: for company addresses |
| first\_name  | string  | The address first name. |
| last\_name  | string  | The address last name. |
| address\_line\_1  | string  | The first address line. |
| address\_line\_2  | string  | The second address line. |
| city  | string  | The address city. |
| country\_code  | string  | ISO3166 Alpha-2 country code. |
| company\_name  | string | The company name (for addresses of type  "company" ). |
| company\_vat\_number  | string | The company VAT number (for addresses of type "company" ). |
| company\_reg\_number  | string | The company registration number (for addresses of type "company" ). |
| postal\_code  | string  | The address postal code. |

    
Updated about 5 years ago 

https://api.billetto.com/reference/address 1/4  
8/14/25, 7:15 AM Address 

https://api.billetto.com/reference/address 4/4  
8/14/25, 7:16 AM Amount 

    
    API endpoints 

Amount 

Amount 

The amount resource contains information on a financial object 

The Amount object 

| amount  | string  | The amount of the object in cents |
| :---- | :---- | :---- |
| currency  | string  | The three letter Currency code. |

    
Updated over 4 years ago 

  Organiser Subscription   

https://api.billetto.com/reference/amount 1/3  
8/14/25, 7:16 AM Amount 

https://api.billetto.com/reference/amount 2/3  
8/14/25, 7:16 AM Amount 

https://api.billetto.com/reference/amount 3/3  
8/14/25, 7:13 AM API key 

    
    Documentation 

API key 

API key  

In order to send requests towards our API, you'll need to obtain the api-key for your account. This can be done by: 

Creating an account with Billetto 

Visiting the organiser universe by clicking on Switch to Organiser 

Within the Menu click on Integrate 

In the Sub Navigation select Developers 

From here generate an api key pair 

Please note that you will need to note down your secret key as after first read this is no longer accessible. 

Authentication through API Keypair 

In the header of your API request use: Api-Keypair with the key and secret connected by a : 

| Header  | Value |
| :---- | :---- |
| Api-Keypair  | \>\>YourAPIKey:YourAPISecret\<\< |

Example Query with Header 

curl "https://billetto.dk/api/v3/public/events?limit=100" \-H 'Api Keypair:v6MaVDYsLaBftoaUWnfRMSCk4:8mo8j99nYtJBpwAtgz6uU6PNVv3xWwuC4kQ6HzRq3bEyxT 

    
Updated over 3 years ago 

  Getting Started OAuth 2.0   https://api.billetto.com/docs/obtaining-an-api-key 1/1  
8/14/25, 7:15 AM Application 

    
    API endpoints 

Application 

Application 

The Application resource contains information about connected applications that have access to your data. 

The Application object 

| id  | string  | The unique application identifier. |
| ----- | ----- | :---- |
| object  | string  | The application object type, set to "application" . |
| name  | string  | The application name. |
| created\_at  | datetime  | The creation date & time of the application. |
| updated\_at  | datetime  | The date & time of the last update of the application resource. |

    
Updated about 5 years ago 

  Address Booking Question   

https://api.billetto.com/reference/application 1/3  
8/14/25, 7:15 AM Application 

https://api.billetto.com/reference/application 2/3  
8/14/25, 7:15 AM Application 

https://api.billetto.com/reference/application 3/3  
8/14/25, 7:09 AM Attendee 

    
    API endpoints 

Attendee 

Attendee 

The Attendee object represents the details of Attendee (ticket holder to one or more event). There is an Attendee per each ticket sold or generated. 

The attendee object 

| Attribute name  | Type  | Description |
| :---- | :---- | :---- |
| id  | string  | Unique identifier for the object. |
| object  | string | Attendee object type, always set to "attendee" . |
| barcode  | string | The barcode that is printed on the ticket and can be scanned at the entrance. |
| state  | string (enum) | Attendee status, one of:  \- sold  \- reserved  \- refunded  \- manually\_generated  \- cancelled  Some old attendees might have assigned one of legacy statuses:  \- available  \- door\_sale  \- draft  \- failed  \- mass\_generated |
| created\_at | datetime (UTC  ISO8601 string) | Creation date & time. |
| updated\_at | datetime (UTC  ISO8601 string) | Last update date & time. |

https://api.billetto.com/reference/attendee 1/5  
8/14/25, 7:09 AM Attendee 

| Attribute name  | Type  | Description |
| :---- | :---- | :---- |
| fee\_included  | boolean | Indicates whether the Billetto fee is included in the ticket price or not. |
| price  | integer  | The ticket price in cents. |
| fee  | integer  | The ticket Billetto fee in cents. |
| name  | string  | The Attendee name. |
| email  | string  | The Attendee email. |
| order  | string (expandable) | The order ID used to buy the ticket. Can be undefined when a ticket for the attendee was  generated.  Expands to the Order resource. |
| subscription  | string (expandable) | The subscription ID used to buy the subscription. Can be  undefined when a ticket is not a subscription.  Expands to the Subscription resource |
| membership  | string (expandable) | The membership event ID  connected to the ticket. |
| space  | string(expandable) | The seat label for the specific seat assigned to the ticket on a seated event. |
| address\_line\_1  | string | The first address line if address provided. |
| address\_line\_2  | string | The second address line if  address provided. |
| postal\_code  | string | The address postal code if  provided. |
| city  | string  | The address city if provided. |
| country\_code  | string | ISO3166 Alpha-2 country code when the address is provided. |
| phone\_number  | string | The attendee phone number if provided. |

https://api.billetto.com/reference/attendee 2/5  
8/14/25, 7:09 AM Attendee 

| Attribute name  | Type  | Description |
| ----- | :---- | :---- |
| scannings  | list | The list object with collection of Scanning resources. |
| booking\_question\_responses  | list | The list object with collection of Booking Question Responses resources. |
| order\_line  | string (expandable) | The order line ID.  Expands to the Order Line  resource. |
| ticket\_type  | string (expandable) | The ticket type ID.  Expands to the Ticket Type  resource. |
| event  | string(expandable) | The list object of the first event purchase of the ticket. If a  subscription usually the parent event.  Expands to the event resource. |
| events | list(hidden but  expandable) | The list object with collection that includes the events that attendee can attend using the ticket.  Expands to the events resource |
| newsletter\_permission  | boolean | Indicates whether the attendee has granted permission to be signed up in the organiser's newsletter |

    
Updated over 4 years ago 

  Guides List attendees   

https://api.billetto.com/reference/attendee 3/5  
8/14/25, 7:09 AM Attendee 

https://api.billetto.com/reference/attendee 4/5  
8/14/25, 7:09 AM Attendee 

https://api.billetto.com/reference/attendee 5/5  
8/14/25, 7:15 AM Booking Question Response 

    
    API endpoints 

Booking Question Response 

Booking Question Response 

Stores information about booking question responses. 

The Booking Question Response object 

| id  | string  | The unique response identifier. |
| ----- | :---- | :---- |
| object  | string | The object type, set to  "booking\_question\_response" |
| text  | string  | The actual response to the question. |
| question | string  (expandable) | The question ID.  Expands to the Booking Question resource. |

    
Updated about 5 years ago 

  Booking Question Gallery Item   

https://api.billetto.com/reference/booking-question-response 1/3  
8/14/25, 7:15 AM Booking Question Response 

https://api.billetto.com/reference/booking-question-response 2/3  
8/14/25, 7:15 AM Booking Question Response 

https://api.billetto.com/reference/booking-question-response 3/3  
8/14/25, 7:15 AM Booking Question 

    
    API endpoints 

Booking Question 

Booking Question 

The booking question resource contains information about custom questions that organisers can assign to events. 

The Booking Question object 

| id  | string  | The unique booking question identifier. |
| ----- | ----- | :---- |
| object  | string | The booking question object type, set to  "booking\_question" . |
| name  | string  | The booking question name. |
| description  | string  | The description of the booking question. |
| required  | boolean  | Indicates if the question answer is required. |
| created\_at  | datetime  | The creation date & time. |
| updated\_at  | datetime  | The last update date & time. |
| scope  | enum | The scope of the question, one of:  \- order: if the question should be asked once per the whole order  \- ticket: if the question should be asked for each ticket in the order |
| for\_all\_ticket\_types  | boolean | Included only for booking questions with type of "ticket" . Indicates whether a question should be asked for all ticket types. |
| product\_type\_ids | array of  strings | Included only for booking questions with type of "ticket" . Stores the IDs of ticket types for which the question should be answered when  for\_all\_ticket\_types is set to false . |

    
Updated about 5 years ago 

https://api.billetto.com/reference/booking-question 1/4  
8/14/25, 7:15 AM Booking Question 

  Application Booking Question Response   https://api.billetto.com/reference/booking-question 2/4  
8/14/25, 7:15 AM Booking Question 

https://api.billetto.com/reference/booking-question 3/4  
8/14/25, 7:15 AM Booking Question 

https://api.billetto.com/reference/booking-question 4/4  
8/14/25, 7:16 AM Campaign Condition 

    
    API endpoints 

Campaign Condition 

Campaign Condition 

The campaign condition resource contains information about the conditions to unlock a campaign. 

The campaign\_condition object 

| id  | string  | The unique campaign identifier. |
| ----- | ----- | :---- |
| object  | string | The campaign effect object type, set to  "campaign\_condition" . |
| kind  | string | The type of condition required to activate the campaign, one of:  \- time  \- targetgroup  \- totalquantity  \- tickettypequantity  \- saleschannel  \- accesscode |
| operator  | operator | Certain condition types require an operator, one: \- eq  \- neq  \- lt  \- let  \- gt  \- get |
| value  | integer | Certain condition types require a value pair with an operator. The value used with the rule to unlock the campaign |
| target\_group\_id  | string | If kind targetgroup , this is the unique id assigned to that target group. |
| ticket\_type\_id  | integer | If kind \= tickettypequantity , this is the numeric id assigned to that ticket type. |
| code  | string | If kind \= accesscode , the code used to unlock the campaign |

https://api.billetto.com/reference/campaign-condition 1/4  
8/14/25, 7:16 AM Campaign Condition 

| start  | datetime | If kind \= time , the date and time the campaign should start |
| :---- | :---: | :---- |
| end  | datetime | If kind \= time , the date and time the campaign should end |

    
Updated almost 5 years ago 

  Venue Campaign Effect   

https://api.billetto.com/reference/campaign-condition 2/4  
8/14/25, 7:16 AM Campaign Condition 

https://api.billetto.com/reference/campaign-condition 3/4  
8/14/25, 7:16 AM Campaign Condition 

https://api.billetto.com/reference/campaign-condition 4/4  
8/14/25, 7:16 AM Campaign Effect 

    
    API endpoints 

Campaign Effect 

Campaign Effect 

The campaign effect resource contains information about the effects unlocked with a campaign. 

| id  | string  | The unique campaign identifier. |
| ----- | ----- | :---- |
| object  | string | The campaign effect object type, set to  "campaign\_effect" . |
| kind  | string | The campaign effect, one of:  \-set-ticket-type-price  \- percentage-discount-ticket-type-price  \- unlock-ticket-types  \- unlock-seat  \- unlock-seat-category  \- unlock-seat-category-for-target-group-member \- percentage-discount-for-target-group-member |
| ticket\_type\_id  | string  | The numeric ticket type id affected by the campaign. |
| seat\_is\_free  | boolean | If kind \= unlock-seat , option to make the specific seat free |
| preselect  | boolean | If kind \= unlock-seat , option to put seats in basket for ticket buyer |
| identifier  | boolean | If condition includes target group, option for target group (bar)code to become the new barcode. |
| seat\_categories  | string | If kind \= unlock-seat-category , the seat category name the campaign is unlocking |
| percentage\_discount  | integer | The percentage discount affecting the ticket/order (range: 0-100) |
| ticket\_type\_price  | integer | The discounted ticket price of selected ticket in "ticket\_type\_id" |
| order\_limit  | integer | The number of tickets in one basket that the effect will be applied to |

https://api.billetto.com/reference/campaign-effect 1/4  
8/14/25, 7:16 AM Campaign Effect 

| usage\_limit  | integer | The maximum tickets that can be purchased with the campaign before it stops. |
| :---- | :---: | :---- |
| orders\_limit  | integer | The maximum orders that can be purchased with the campaign before it's unusable. |

    
Updated almost 5 years ago 

  Campaign Condition Categorisation   

https://api.billetto.com/reference/campaign-effect 2/4  
8/14/25, 7:16 AM Campaign Effect 

https://api.billetto.com/reference/campaign-effect 3/4  
8/14/25, 7:16 AM Campaign Effect 

https://api.billetto.com/reference/campaign-effect 4/4  
8/14/25, 7:10 AM Campaigns 

    
    API endpoints 

Campaigns 

Campaigns 

The Campaign resource contains all information about campaigns created both on the account level and within an event. 

The Global Campaign object 

| id  | string  | The unique Campaign identifier. |
| ----- | :---- | :---- |
| object  | string  | The object type, set to "campaign" . |
| name  | string  | The campaign name. |
| state  | string | The campaign state, one of:  \- paused  \- prepared  \- running |
| event | string  (expandable) | Event id connected to the campaign, if a Global campaign will be null |
| applications\_count  | enum | The number of times the campaign has been used in an order |
| conditions  | list  | A list of Campaign conditions resources. |
| effects  | list  | A list of Campaign effects resources. |
| events | expandable  list | A list of Event resources where the campaigns is enabled in (for campaigns created on the event level, this list will always include only that event) |

    
Updated over 4 years ago 

  Create a target group import List campaigns   

https://api.billetto.com/reference/global-campaigns 1/3  
8/14/25, 7:10 AM Campaigns 

https://api.billetto.com/reference/global-campaigns 2/3  
8/14/25, 7:10 AM Campaigns 

https://api.billetto.com/reference/global-campaigns 3/3  
8/14/25, 7:16 AM Categorisation 

    
    API endpoints 

Categorisation 

Categorisation 

The categorisation resource contains information about the category, sub category and type of the event. 

The Categorisation object 

| category  | string  | The category of the event (can be null) |
| :---- | :---: | :---- |
| category\_localized  | string  | The localised category (can be null) |
| subcategory  | string  | The sub-category of the event (can be null) |
| subcategory\_localized  | string  | The localised subcategory (can be null) |
| type  | string  | The type of the event (can be null) |
| type\_localized  | string  | The localised type (can be null) |

Event Categories 

One of: 

auto\_boat 

business 

charity 

community 

family 

fashion 

film\_media 

food\_drink 

government 

health\_wellness 

hobbies 

lifestyle 

music 

performing\_arts 

religion 

https://api.billetto.com/reference/categorisation-1 1/9  
8/14/25,7:16AMCategorisation 

school 

science 

seasonal 

sports 

travel 

other 

Sub\_Categories 

Oneof: 

accessories 

adult 

after\_school\_care 

air 

alternative 

alumni 

americanfootball 

animal\_welfare 

anime 

auto 

baby 

baking 

ballet 

baseball 

basketball 

beauty 

beer 

biotech 

blues\_jazz 

boat 

books 

bridal 

buddhism 

camps 

canoeing 

career 

chanukkah 

cheer 

children\_youth 

christianity 

https://api.billetto.com/reference/categorisation-12/9  
8/14/25,7:16AMCategorisation 

christmas 

city\_town 

classical 

climbing 

comedy 

comics 

cooking 

country 

county 

craft 

cultural 

cycling 

dance 

dating 

design 

diet 

dinner 

disaster\_relief 

diy 

drawing\_painting 

easter 

eastern\_religion 

edm\_electronic 

education 

educators 

environment 

exercise 

fall\_events 

fashion\_beauty 

fighting\_martial 

film

finance 

fine\_art 

folk 

food 

football 

fundraiser 

gaming 

golf 

halloween\_haunt 

https://api.billetto.com/reference/categorisation-13/9  
8/14/25,7:16AMCategorisation 

healthcare 

heritage 

high\_tech 

hiking 

hiphop\_rap 

historic 

hockey 

home\_garden 

human\_rights 

hunting\_fishing 

independence\_day 

indie 

international\_affairs 

international\_aid 

investment 

islam 

jewelry 

judaism 

kayaking 

knitting 

lacrosse 

language 

latin 

leadership 

lecture 

lgbt 

literary\_arts 

live 

local\_government 

media 

medical 

medicine 

medieval 

meditation 

mental\_health 

metal 

military 

mindfulness 

mobile 

mormonism 

https://api.billetto.com/reference/categorisation-14/9  
8/14/25,7:16AMCategorisation 

motorcycle 

motorsports 

mountain\_biking 

musical 

mysticism\_occult 

national\_government 

national\_security 

nationality 

new\_age 

newyearseve 

nonprofit 

obstacles 

opera 

orchestra 

other 

painting 

parenting 

parents\_association 

parking 

personal\_health 

pets\_animals 

photography 

pole\_dancing 

pop 

poverty 

public\_speaker 

raffle 

rafting 

randb 

real\_estate 

reggae 

religious\_spiritual 

renaissance 

reunion 

robotics 

rock 

rugby 

running 

sales\_marketing 

science 

https://api.billetto.com/reference/categorisation-15/9  
8/14/25,7:16AMCategorisation 

sculpture 

senior\_citizen 

show 

sikhism 

skiing 

skydiving 

snow\_sports 

social\_media 

softball 

spa 

spirits 

startups 

stpatricksday 

swimming\_sports 

techno 

tennis 

thanksgiving 

theatre 

top40 

track\_field 

travel 

tv

volleyball 

walking 

weightlifting 

wine 

winter\_sports 

wrestling 

yoga 

Type 

Oneof: 

appearance 

attraction 

camp\_trip 

class\_training 

concert 

conference 

convention 

https://api.billetto.com/reference/categorisation-16/9  
8/14/25, 7:16 AM Categorisation dinner 

festival 

game 

meeting 

party 

race 

rally 

screening 

seminar 

tour 

tournament 

tradeshow 

other 

    
Updated over 4 years ago 

  Campaign Effect Organiser   https://api.billetto.com/reference/categorisation-1 7/9  
8/14/25, 7:16 AM Categorisation 

https://api.billetto.com/reference/categorisation-1 8/9  
8/14/25, 7:16 AM Categorisation 

https://api.billetto.com/reference/categorisation-1 9/9  
8/14/25, 7:10 AM Create a target group import 

    
    API endpoints 

Create a target group import 

Create a target group import 

POST https://billetto.dk/api/v3/organiser/target\_group\_imports 

This endpoint allows you to POST to an existing or new target group 

LOG IN TO SEE FULL REQUEST HISTORY 

TIME STATUS USER AGENT 

Make a request to see history. 

0 Requests This Month 

HEADERS 

Billetto-Version string 

(optional) The version string to override the API version, defaults to v2021-01- 

01 

RESPONSE 

**202** 

202 

LANGUAGE 

  Shell 


Node   
  Ruby   
  PHP   
   

JavaScript 

CREDENTIALS HEADER   Header Api-Keypair 

REQUEST 

1 const options \= {method: 'POST', headers: {accept: 'application/json'}}; 

2 

https://api.billetto.com/reference/post-a-target-group 1/3  
8/14/25, 7:10 AM Create a target group import 

3   
fetch('https://billetto.dk/api/v3/organiser/target\_group\_imports', options) 4   
 .then(res \=\> res.json()) 

5   
 .then(res \=\> console.log(res)) 

~~6~~   
~~catch(err \=\> console error(err));~~ 

Try It\! 

RESPONSE EXAMPLES   

Click Try It\! to start a request and see the response here\! Or choose an example: 

application/json 

202 \- Upsert Existing Target Group 

    
Updated over 4 years ago 

  List Target Group Import Members Campaigns   https://api.billetto.com/reference/post-a-target-group 2/3  
8/14/25, 7:10 AM Create a target group import 

https://api.billetto.com/reference/post-a-target-group 3/3  
8/14/25, 7:10 AM Create a target group member 

    
    API endpoints 

Create a target group member 

Create a target group member 

POST https://billetto.dk/api/v3/organiser/target\_group\_members 

This endpoint allows you to create a single target group member 

LOG IN TO SEE FULL REQUEST HISTORY 

TIME STATUS USER AGENT 

Make a request to see history. 

QUERY PARAMS 

target\_group string 

(required) The target group UUID 

code string 

(required) To update the code for the member 

space\_identifier string 

(optional) To update the space identifier for the member 

limit string 

(optional) To update the limit for the member 

quantity string 

(optional) To update the quantity for the member 

category\_key string 

(optional) To update the category\_key for the member 

HEADERS 

Billetto-Version string 

(optional) The version string to override the API version, defaults to v2021-01- 

01 

https://api.billetto.com/reference/create-a-target-group-member 1/4  
8/14/25, 7:10 AM Create a target group member RESPONSES 

**201** 

201 

**400** 

400 

**409** 

409 

LANGUAGE 

  Shell 


Node   
  Ruby   
  PHP   
   

JavaScript 

CREDENTIALS HEADER   Header Api-Keypair 

FETCH REQUEST 


1   
const options \= {method: 'POST', headers: {accept: 'application/json'}}; 2 

3   
fetch('https://billetto.dk/api/v3/organiser/target\_group\_members', options) 4   
 .then(res \=\> res.json()) 

5   
 .then(res \=\> console.log(res)) 

6   
 .catch(err \=\> console.error(err)); 

Try It\! 

RESPONSE EXAMPLES   

Click Try It\! to start a request and see the response here\! Or choose an example: 

application/json 

201 \- Result 

    
Updated over 1 year ago 

https://api.billetto.com/reference/create-a-target-group-member 2/4  
8/14/25, 7:10 AM Create a target group member 

  Delete a target group member Target Group Imports   https://api.billetto.com/reference/create-a-target-group-member 3/4  
8/14/25, 7:10 AM Create a target group member 

https://api.billetto.com/reference/create-a-target-group-member 4/4  
8/14/25, 7:10 AM Delete a target group member 

    
    API endpoints 

Delete a target group member 

Delete a target group member 

DDDDEEEELLLLEEEETTTTEEEE https://billetto.dk/api/v3/organiser/target\_group\_members/{id} 

This endpoint allows you to delete a single target group member 

LOG IN TO SEE FULL REQUEST HISTORY 

TIME STATUS USER AGENT 

Make a request to see history. 

0 Requests This Month 

PATH PARAMS 

id string required 

The target group member id 

QUERY PARAMS 

target\_group string 

(required)The target group ID 

HEADERS 

Billetto-Version string 

(optional) The version string to override the API version, defaults to v2021-01- 

01 

RESPONSES 

**204** 

204 

**400** 

400 

https://api.billetto.com/reference/delete-a-target-group-member 1/4  
8/14/25, 7:10 AM Delete a target group member 

**409** 

409 

LANGUAGE 

  Shell 


Node   
  Ruby   
  PHP   
   

JavaScript 

CREDENTIALS HEADER   Header Api-Keypair 

FETCH REQUEST 


1   
const options \= {method: 'DELETE', headers: {accept: 'application/json'}}; 2 

3   
fetch('https://billetto.dk/api/v3/organiser/target\_group\_members/id', options) 4   
 .then(res \=\> res.json()) 

5   
 .then(res \=\> console.log(res)) 

6   
 .catch(err \=\> console.error(err)); 

Try It\! 

RESPONSE 

Click Try It\! to start a request and see the response here\! 

    
Updated almost 2 years ago 

  Update a target group member Create a target group member   https://api.billetto.com/reference/delete-a-target-group-member 2/4  
8/14/25, 7:10 AM Delete a target group member 

https://api.billetto.com/reference/delete-a-target-group-member 3/4  
8/14/25, 7:10 AM Delete a target group member 

https://api.billetto.com/reference/delete-a-target-group-member 4/4  
8/14/25, 7:09 AM Delete a target group 

    
    API endpoints 

Delete a target group 

Delete a target group 

DDDDEEEELLLLEEEETTTTEEEE https://billetto.dk/api/v3/organiser/target\_groups/{id} 

This endpoint allows you to retrieve a single target group. 

LOG IN TO SEE FULL REQUEST HISTORY 

TIME STATUS USER AGENT 

Make a request to see history. 

0 Requests This Month 

PATH PARAMS 

id string required 

The target group ID 

HEADERS 

Billetto-Version string 

(optional) The version string to override the API version, defaults to v2021-01- 

01 

RESPONSE 

**204** 

204 

LANGUAGE 

  Shell 


Node   
  Ruby   
  PHP   
   

JavaScript 

CREDENTIALS HEADER   https://api.billetto.com/reference/delete-a-target-group 1/3  
8/14/25, 7:09 AM Delete a target group Header Api-Keypair 

FETCH REQUEST 


1 

2 

3 

4 

5 

6 

Try It\!   
const options \= {method: 'DELETE', headers: {accept: 'application/json'}}; 

fetch('https://billetto.dk/api/v3/organiser/target\_groups/id', options)  .then(res \=\> res.json()) 

 .then(res \=\> console.log(res)) 

 .catch(err \=\> console.error(err)); 

RESPONSE 

Click Try It\! to start a request and see the response here\! 

    
Updated almost 2 years ago 

  Retrieve a target group Target Group Members   https://api.billetto.com/reference/delete-a-target-group 2/3  
8/14/25, 7:09 AM Delete a target group 

https://api.billetto.com/reference/delete-a-target-group 3/3  
8/14/25, 7:13 AM Errors 

    
    Documentation 

Errors 

Errors  Billetto uses conventional HTTP response codes to indicate the success or failure of an API   
request. In general all codes in 2xx range indicate success. Codes in the 4xx range indicate an error that failed given the information provided (e.g., ratelimiting, a missing required parameter, authentication error, etc.). Codes in the 5xx range indicate an error on our side. 

If an error response contain any body, it is JSON-encoded and have the following attributes: 

error: { 

 message: "an error occurred", 

 type: "invalid\_request\_error" 

} 

It could also include other properties in the error object. 

    
Updated over 4 years ago 

  Pagination Versioning   https://api.billetto.com/docs/errors 1/1  
8/14/25, 7:08 AM Event Campaigns 

    
    API endpoints 

Event Campaigns 

Event Campaigns 

The Campaign resource contains all information about campaigns used on a specific event 

The Campaign object 

| id  | string  | The unique Campaign identifier. |
| ----- | :---- | :---- |
| object  | string  | The object type, set to "campaign" . |
| name  | string  | The campaign name. |
| state  | string | The campaign state, one of:  \- paused  \- prepared  \- running |
| event | string  (expandable) | Event id connected to the campaign, if a Global campaign will be null |
| applications\_count  | enum | The number of times the campaign has been used in an order |
| conditions  | list  | A list of Campaign conditions resources. |
| effects  | list  | A list of Campaign effects resources. |
| events | expandable  list | A list of Event resources where the campaigns is enabled in (for campaigns created on the event level, this list will always include only that event) |

When requesting a campaign that is globally created within the event scope, the application count will be limited to used within the event. If you wish to see the overall count across all events please use the Global Campaigns endpoint 

    
Updated over 4 years ago 

https://api.billetto.com/reference/event-campaigns 1/3  
8/14/25, 7:08 AM Event Campaigns 

  Retrieve an order List event campaigns   https://api.billetto.com/reference/event-campaigns 2/3  
8/14/25, 7:08 AM Event Campaigns 

https://api.billetto.com/reference/event-campaigns 3/3  
8/14/25, 7:09 AM Event     API endpoints 

Event 

Event 


Contains all information about events organised by the current organiser. Can be used to retrieve the list or a single event. 

The Event object 

| id  | string  | The unique event identifier. |
| :---- | :---- | :---- |
| object  | string  | The object type, set to "event" . |
| name  | string  | The event name. |
| currency  | string  | ISO 4217 currency code. |
| state  | enum | The event status. One of:  \- canceled  \- completed  \- deleted  \- draft  \- published  \- publishing |
| public  | boolean | Indicates whether an event is publicly available or not. |
| host  | string | The event host. (Found in expandable editorial resource) |
| category  | enum | The event category. (Found in expandable editorial resource) |
| subcategory  | enum | The event subcategory. (Found in expandable editorial resource) |
| type  | enum | The event type. (Found in expandable editorial resource) |
| tags  | array of strings | A list of up to 3 tags. (Found in expandable editorial resource) |

https://api.billetto.com/reference/event 1/4  
8/14/25, 7:09 AM Event 

| manage\_url  | URL | The URL to the event management page,  accessible to the organiser. (Found in expandable editorial resource) |
| ----- | :---- | :---- |
| online\_event  | boolean  | Indicates whether an event is performed online. |
| description  | text | The event description text. (Found in expandable editorial resource) |
| description\_html  | text | The event description in HTML. (Found in expandable editorial resource) |
| kind  | enum | The event kind. One of:  \- recurring: for an instance of the recurring event \- regular: for the regular, one-time event  \- scheduled: for the main event that aggregates one or more recurring events  \- sub\_event: (deprecated) for events that are part of the subscription event  \- subscription: for events that sell memberships |
| parent | string  (expandable) | The parent event ID for events with recurring or sub\_event kind.  Expands to the Event resource. |
| public\_url  | URL  | The public event page URL. |
| starts\_at  | datetime  | Indicates when the event starts. |
| ends\_at  | datetime  | Indicates when the event ends. |
| published\_at  | datetime  | The date & time of the initial event publication. |
| created\_at  | datetime  | The creation date & time. |
| updated\_at  | datetime  | The date & time of the last event update. |
| gallery\_items  | list | The list object with collection of Gallery Item resources. |

availability hash The information about event availability, contains the following properties: 

\- available (integer): the number of tickets 

available for the event 

\- status (enum): the textual representation of the 

available ticket, one of: 

\- sold\_out 

\- low (when there are 1-5 tickets available) 

https://api.billetto.com/reference/event 2/4  
8/14/25, 7:09 AM Event 

|  |  | \- medium (when there are 6-15 tickets available) \- high (when there are more than 15 tickets available) |
| :---- | :---- | :---- |
| ticket\_types  | list | The list object with collection of Ticket Type resources. |
| max\_capacity  | integer  | The event's maximum capacity for tickets |
| venue | string  (expandable) | The event venue ID if used. Generally only for seated events  Expands to the Venue resource. |
| location | string  (expandable) | The Location ID if used. Expands the location resource |
| organization | string  (expandable) | The event organization ID.  Expands to the Organization resource. |

    
Updated almost 2 years ago 

  List attendees on a specific event List events   

https://api.billetto.com/reference/event 3/4  
8/14/25, 7:09 AM Event 

https://api.billetto.com/reference/event 4/4  
8/14/25, 7:14 AM Expandable resources 

    
    API endpoints 

Expandable resources 

Expandable resources 

Expandable resources allow you to request multiple data objects within one call, the following resources are expandable in another endpoint: 

ticket\_type 

order\_line 

attendees 

product\_type 

order 

space 

subscription 

event 

events 

venue 

location 

ledger\_entries 

editorial (Event description and pages) 

Expanding a single resource 

You can expand an object by adding a parameter to your query: 

expand=data.space for a list 

or 

expand=space for a specific individual retrieval endpoint 

Expanding multiple resources 

If you require more than one expansion of resources you can do this by separating them with a , comma. 

For Example: 

expand=data.space,data.order\_line 

Expanding multiple levels 

If the value you want is nested deeply across multiple linked resources, you can reach it by recursively expanding using a dot . . 

https://api.billetto.com/reference/expandable-resources 1/3  
8/14/25, 7:14 AM Expandable resources 

Requesting resources not included by default using Expand 

Some resources can be added to an endpoint response by using the Expand parameter. For Example: 

Events is not included by default in the Attendee list but can be requested: expand=data.events 

    
Updated almost 2 years ago 

  Pagination Resource List Resource   https://api.billetto.com/reference/expandable-resources 2/3  
8/14/25, 7:14 AM Expandable resources 

https://api.billetto.com/reference/expandable-resources 3/3  
8/14/25, 7:13 AM Expanding Resources 

    
    Documentation 

Expanding Resources 

Expanding Resources  

Some objects allow you to request additional information as an expanded response by using the expand request parameter. This parameter is available on all API requests, and applies to the response of that request only. 

In many cases, an object contains the ID of a related object in its response properties. For example, an Order may have an associated Event ID. Those objects can be expanded inline with the expand request parameter. ID fields that can be expanded into objects are noted in this documentation with the expandable label. 

You can expand recursively by specifying nested fields after a dot . . 

For Example: 

https://billetto.dk/api/v3/organiser/events?expand=data.organization 

Requesting event.organization on an order will expand the event property on the order into a full Event object, and will then expand the organization property on that event into a full Organization object. 

You can use the expand param on any endpoint which returns expandable fields, including list, create, and update endpoints. 

Expansions on list requests start with the data property. For example, you would expand data.event on a request to list orders and associated events. Many deep expansions on list requests can be slow. 

Expansions have a maximum depth of four levels. You can expand multiple objects at once by providing multiple items in the expand parameter delimited with a comma , (e.g., order\_line,event.organization ). 

    
Updated over 1 year ago 

  Versioning Overview   https://api.billetto.com/docs/expanding-resources 1/1  
8/14/25, 7:15 AM Gallery Item 

    
    API endpoints 

Gallery Item 

Gallery Item 

The gallery item contains information about images associated with the Event resource. 

The Gallery Item object 

| id  | string  | The unique identifier of the Gallery Item. |
| ----- | ----- | :---- |
| object  | string  | The object type, set to "gallery\_item" . |
| author  | string | The photo author of the Unsplash image (when a gallery item's type is set to "unsplash" ). |
| author\_url  | URL | The URL to the author page of the Unsplash image (when a gallery item's type is set to "unsplash" ). |
| type  | enum | The gallery item type. One of:  \- unsplash: for images retrieved from Unsplash  \- upload: for images uploaded by organisers |
| crop\_x  | integer  | The cropping starting position on the X-axis. |
| crop\_y  | integer  | The cropping starting position on the Y-axis. |
| crop\_w  | integer  | The cropping area width. |
| crop\_h  | integer  | The cropping area height. |
| width  | integer  | The original image width. |
| height  | integer  | The original image height. |
| position  | integer  | The position of the gallery item on the gallery item's list. |
| original\_url  | URL  | The URL of the original image. |
| cropped\_url  | URL  | The URL of the cropped version of the image (600x400 px) |
| huge\_url  | URL | The URL of the huge version of the image (generated from the cropping attributes). |

https://api.billetto.com/reference/gallery-item 1/4  
8/14/25, 7:15 AM Gallery Item 

| share\_url  | URL | The URL of the share version of the image (1200x630 px) used when an event is shared on social media pages. |
| :---- | :---- | :---- |

    
Updated about 5 years ago 

  Booking Question Response Headliner   

https://api.billetto.com/reference/gallery-item 2/4  
8/14/25, 7:15 AM Gallery Item 

https://api.billetto.com/reference/gallery-item 3/4  
8/14/25, 7:15 AM Gallery Item 

https://api.billetto.com/reference/gallery-item 4/4  
8/14/25, 7:15 AM Headliner 

    
    API endpoints 

Headliner 

Headliner 

The headliner contains information about event headliner associated with the Event resource. 

The Headliner object 

| id  | string  | The unique identifier of the Gallery Item. |
| :---- | :---- | :---- |
| object  | string  | The object type, set to "headliner" . |
| name  | string  | Headliner name |
| title  | string  | Headliner title |
| description  | string  | Headliner description |
| image\_url  | URL  | The URL of the headliner image. |

    
Updated 10 months ago 

  Gallery Item Location   

https://api.billetto.com/reference/gallery-item-copy 1/3  
8/14/25, 7:15 AM Headliner 

https://api.billetto.com/reference/gallery-item-copy 2/3  
8/14/25, 7:15 AM Headliner 

https://api.billetto.com/reference/gallery-item-copy 3/3  
8/14/25, 7:09 AM Ledger Entries     API endpoints 

Ledger Entries 

Ledger Entries 

Ledger entries for transactions and refunds 

  

| id  | integer  | The ledger\_entry id |
| :---- | ----- | :---- |
| type  | string  | ledger\_entry |
| time  | datetime  | The time of the entry |
| created\_at  | datetime  | The creation time of the event |
| entry\_type  | string | one of:  ORDER\_REVENUE  ORGANIZER\_PAYMENT\_FEE  TICKETS\_FEE  IMMEDIATE\_PAYOUT  COMMISSION  IMMEDIATE\_PAYOUT\_WITHDRAWAL  CHARGEBACK  PROMOTION\_FEE  INVOICE\_FEE  WALLET\_CHARGE  DISCOUNTS  PAYOUT |

entry\_subtype string The one of: 

fee\_included 

fee\_excluded 

payment\_processing\_fee 

mobile\_pay\_fee 

einvoicing\_transaction\_fee 

online\_order 

till\_order 

UpdateOrder 

product\_item\_canceled 

admission 

product 

donation 

swish\_payment\_fee 

paypal\_payment\_fee 

https://api.billetto.com/reference/timeline 1/4  
8/14/25, 7:09 AM Ledger Entries 

|  |  | vipps\_payment\_fee  klarna\_payment\_fee  klarna\_pay\_over\_time\_payment\_fee  klarna\_pay\_later\_payment\_fee |
| ----- | :---- | :---- |
| purchase\_terminal  | string | The payment terminal used for purchase, likely online but one of:  \- online  \- box-office |
| terminal\_name  | string  | The terminal name if used |
| cash\_register\_session\_uuid  | string | If using cash register functionality the Unique ID |
| payment\_gateway  | string | The payment gateway used for  purchase/refund, one of:  \- Stripe  \- Reepay  \- Null gateway |
| transaction\_type  | string | The type of transaction, one of:  \- PAYMENT  \- CANCELLATION  \- REFUND  \- FAILED |
| amount  | integer  | The total amount for the transaction |
| vat  | integer  | the VAT amount for the transaction |
| currency  | string  | The three letter Currency code. |
| event\_id  | string  | The event id connected to the ledger entry |
| order\_id  | string  | The order id connected to the ledger entry |

    
Updated over 4 years ago 

 List Ticket Types for Account or   
List Ledger Entries     
Specific Event 

https://api.billetto.com/reference/timeline 2/4