/* global gapi */
import React from "react";
import moment from "moment-timezone";
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import SchedulerService from "./SchedulerService.js";
import CheckBox from "./Checkbox";
import AddEventModal from "./AddModalService.js";
import EditEventModal from "./EditModalService.js";
import list, { put } from "../../_helper/api";
import {
  ArrowBackIos,
  ArrowForwardIos,
  LocalConvenienceStoreOutlined,
} from "@material-ui/icons";
import TranslationContext from "../../context/translation";
import { toast } from "react-toastify";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@material-ui/core/TextField";
// moment.tz.setDefault("UTC");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

class Scheduler extends React.Component {
  static contextType = TranslationContext;
  constructor(props) {
    super(props);
    this.SchedulerService = new SchedulerService();
    this.isAuthorized = false;
    this.googleAuth = null;
    this.currentApiRequest = null;
    // this.allEvent = [];
    this.eventArray = [];
    this.state = {
      calendars: [],
      events: [],
      allEvent: [],
      filterEvents: [],
      originalEventsData: [],
      calendarEvent: {
        Id: "",
        Title: "",
        SummaryNotes: "",
        StartDate: "",
        EndDate: "",
        consultant_NationalID: "",
        patient_NationalID: "",
        calendarID: "",
      },
      show: false,
      showEdit: false,
      calander_show: false,
      physicianData: [],
      searchInput: "",
    };

    this.addEvent = this.addEvent.bind(this);
  }
  showModal = () => {
    this.setState({ show: true });
  };

  hideModal = () => {
    this.setState({ show: false });
  };

  showEditModal = () => {
    this.setState({ showEdit: true });
  };

  hideEditModal = () => {
    this.setState({ showEdit: false });
  };
  printReceipt = () => {
   alert("printed")
  };
  onEventClick = (data) => {
    list(`visit/${data.id}`).then((response) => {
      let data = response.data;
      // console.log(data.id);

      this.setState((state) => {
        state.calendarEvent.Id = data.id;
        state.calendarEvent.Title = data.title;
        state.calendarEvent.consultant_NationalID = data.consultant_NationalID;
        state.calendarEvent.patient_NationalID = data.patient_NationalID;
        state.calendarEvent.SummaryNotes = data.summaryNotes;
        state.calendarEvent.StartDateTime = data.startDateTime;
        state.calendarEvent.EndDateTime = data.endDateTime;
        state.calendarEvent.calendarID = data.calendarID;
        state.calendarEvent.vitalSignID = data.vitalSignID;
        state.calendarEvent.historyID = data.historyID;
      });
      // console.log(this.state.calendarEvent.Id);
      this.showEditModal();
    });
  };
  convertTZ(date, tzString) {
    return new Date(
      (typeof date === "string" ? new Date(date) : date).toLocaleString(
        "en-US",
        { timeZone: tzString }
      )
    );
  }
  changeTimezone(d, ianatz) {
    // console.log("function is called");
    let date = new Date(d);
    // suppose the date is 12:00 UTC
    var invdate = new Date(
      date.toLocaleString("en-US", {
        timeZone: ianatz,
      })
    );
    var diff = date.getTime() - invdate.getTime();
    return date;
  }
  getEvents($class) {
    let that = $class;
    that.SchedulerService.LoadCalendarList().then(async function (response) {
      let calendarList = response.result.items.map((calendar) => {
        return {
          id: calendar.id,
          value: calendar.id,
          name: calendar.summary,
          header: calendar.description,
          isChecked: calendar.selected,
          backgroundColor: calendar.backgroundColor,
          colorId: calendar.colorId,
        };
      });

      that.setState({ calendars: calendarList });
      if ((calendarList.isChecked = true)) {
        await Promise.all(
          calendarList.map(async (x, index) => {
            if (!x.id) {
              return;
            }

            const response = await that.SchedulerService.LoadEventList(x.id);
            let thisEvents = response.result.items.map((thisEvent) => {
              return {
                id: thisEvent.id,
                start: that.changeTimezone(thisEvent.start.dateTime, "UTC"),
                end: that.changeTimezone(thisEvent.end.dateTime, "UTC"),
                title: thisEvent.summary,
                calendarID: thisEvent.organizer?.email || "",
                colorId: x.colorId,
                backgroundColor: x.backgroundColor,
              };
            });
            if ((response.isChecked = true)) {
            } else {
              // console.log("Else Response", response);
            }
            let currentEvents = that.state.events;
            thisEvents.map((evt) => {
              if (currentEvents.some((cEvt) => cEvt.id === evt.id)) {
                // console.log("already includes");
              } else {
                currentEvents.push(evt);
              }
            });
            that.setState({
              events: currentEvents,
              originalEventsData: currentEvents,
            });
          })
        );
      } else {
        // console.log("Else Calender is Called");
      }
    });
  }
  addEvent = (event, start, end, allDay) => {
    let { calendarEvent } = this.state;
    calendarEvent.StartDate = start;
    calendarEvent.EndDate = end;
    this.setState({ calendarEvent });
    this.showModal();
  };
  eventStyleGetter = (event, start, end, isSelected) => {
    var backgroundColor = "#" + event.hexColor;
    var style = {
      backgroundColor: backgroundColor,
      borderRadius: "0px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    };
    return {
      style: style,
    };
  };

  handleCheckChildElement = (event) => {
    let evId = event.target.value;
    let checked = event.target.checked;
    // console.log(evId);
    // console.log(checked);
    if (checked === false) {
      this.setState({
        allEvent: this.state.allEvent.filter((item) => {
          return item?.nationalID !== evId;
        }),
      });
      // console.log(this.state.allEvent);
    } else {
      this.setState({
        allEvent: [
          ...this.state.filterEvents,
          this.state.filterEvents.find((item) => {
            return item?.nationalID === evId;
          }),
        ],
      });
    }
  };

  getAllPhysicians = () => {
    list(
      `/physician/physicianSelectList?pageNumber=1&pageSize=100&QuerySearch=`
    ).then((response) => {
      this.setState({ physicianData: response.data });
      console.log(this.state.physicianData);
    });
  };

  searchBarInputHandler = (event) => {
    this.setState({ searchInput: event.target.value });
    console.log(this.state.searchInput);
    if (event.target.value === "") {
      this.getVisits();
    } else {
      this.setState({
        allEvent: this.state.allEvent.filter((item) => {
          return item?.physician
            ?.toString()
            ?.toLowerCase()
            .includes(event.target.value);
        }),
      });
      // console.log(this.state.allEvent);
    }
  };
  searchBarInputHandlerNew = (e) => {

    const firstTwoChars = e.slice(0, 2);

    if (
      firstTwoChars == "Mr" ||
      firstTwoChars == "Dr" ||
      firstTwoChars == "Ms"
    ) {
      e = e.slice(2);
    }

    e = e.split(" ")[0];

    this.setState({ searchInput: e });
    console.log(this.state.searchInput);
    if (e === "") {
      this.getVisits();
    } else {
      this.setState({
        allEvent: this.state.allEvent.filter((item) => {
          return item?.physician?.toString()?.toLowerCase().includes(e);
        }),
      });
      // console.log(this.state.allEvent);
    }
  };

  getVisits = () => {
    let userId = JSON.parse(localStorage.getItem("user"));
    list(
      `visit/primaryCareVisitsList/ada6189b-3222-4f0a-aae5-0409096dde03?pageNumber=1&pageSize=1000&QuerySearch=&IsConfirm=`
    ).then((response) => {
      const newArr = [];
      response.data.items.map((item) => {
        console.log(item);
        let visitObj = {};
        visitObj.id = item.id;
        visitObj.start = new Date(item.startDateTime);
        visitObj.end = new Date(item.endDateTime);
        visitObj.title = item.title;
        visitObj.nationalID = item.consultant_NationalID;
        visitObj.hexColor = item.colorCode;
        visitObj.physician = item.consultantFirstName;
        if (item.isDeleted === false) {
          newArr.push(visitObj);
        }
      });
      this.setState({ allEvent: newArr });
      this.setState({ filterEvents: [...this.state.allEvent] });
      // console.log(this.state.allEvent);
    });
    // setTimeout(() => {
    //   toast.info("Getting all Appointments. . .")
    //      }, 1000);
  };

  componentDidUpdate = () => {
    this.eventArray = [];
    for (let i = 0; i < this.state.events.length; i++) {
      if (this.state.events[i].title != "Vacant Slot") {
        this.eventArray.push(this.state.events[i]);
      }
    }
  };

  componentDidMount = () => {
    this.getAllPhysicians();
    this.getVisits();
    console.log(this.props.physicianData);
  };

  render() {
    const { translate } = this.context;
    let { calander_show } = this.state;

    // console.log("events afte converting", this.state.originalEventsData);
    return (
      <div>
        <AddEventModal
          show={this.state.show}
          handleClose={this.hideModal}
          eventTitle={this.state.calendarEvent.Title}
          patientData={this.props.patientData}
          physicianData={this.props.physicianData}
          eventStartDate={this.state.calendarEvent.StartDate}
          eventEndDate={this.state.calendarEvent.EndDate}
          calendars={this.state.calendars}
          $class={this}
          getVisits={this.getVisits}
          getEvents={this.getEvents}
          nationalID={this.props.nationalID}
          updateEvent={this.setState()}
        />
        {this.state.showEdit && (
          <EditEventModal
            show={this.state.showEdit}
            handleClose={this.hideEditModal}
            thisSummaryNotes={this.state.calendarEvent.SummaryNotes}
            thisStartDateTime={this.state.calendarEvent.StartDateTime}
            thisEndDateTime={this.state.calendarEvent.EndDateTime}
            thisEventId={this.state.calendarEvent.Id}
            patientData={this.props.patientData}
            physicianData={this.props.physicianData}
            thisTitle={this.state.calendarEvent.Title}
            consultant_NationalID={
              this.state.calendarEvent.consultant_NationalID
            }
            patient_NationalID={this.state.calendarEvent.patient_NationalID}
            vitalSignID={this.state.calendarEvent.vitalSignID}
            historyID={this.state.calendarEvent.historyID}
            calendarId={this.state.calendarEvent.calendarID}
            calendars={this.state.calendars}
            events={this.state.events}
            $class={this}
            getEvents={this.getEvents}
          />
        )}
        <div className="py-3">
          {/* <label htmlFor="Consultant">{translate("SEARCH_PHYSICIAN")}</label>
          <Autocomplete
            style={{
              borderRadius: "7px",
              textAlign: "center",
              fontSize: "20px",
            }}
            options={this.props.physicianData}
            getOptionLabel={(option) =>
              `${option.name} - ${option.phone} - ${option.speciality}`
            }
            // onChange={(event, selected) => {
            //   // this.setConsultant(selected?.nationalID || null);
            //   // let clndr = this.props.physicianData.filter(
            //   //   (data) => data.nationalID == selected?.nationalID
            //   // );
            //   // this.setcalendar(clndr[0].calendarID);
            //   this.searchBarInputHandler(event)
            // }}
            // onChange={(event, value) => this.searchBarInputHandlerNew(value.name)}
            // inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              this.searchBarInputHandlerNew(newInputValue);
            }}
            renderInput={(params) => (
              <TextField {...params} variant="outlined" />
            )}
          /> */}

          <input
            style={{
              borderRadius: "7px",
              textAlign: "center",
              fontSize: "20px",
            }}
            type="text"
            placeholder={translate("SEARCH_PHYSICIAN")}
            value={this.state.searchInput}
            onChange={this.searchBarInputHandler}
          />
        </div>
        <button
          className="calander_show float-right"
          style={{ display: calander_show && "none" }}
          onClick={() => {
            this.setState({ calander_show: true });
          }}
        >
          <ArrowBackIos />
        </button>

        <div className="row">
          <div className={!calander_show ? "col-12" : "col-9"}>
            <DnDCalendar
              selectable
              toolbar
              defaultView="day"
              views={["month", "week", "day"]}
              events={this.state.allEvent}
              localizer={localizer}
              startAccessor="start"
              endAccessor="end"
              onSelectSlot={(e) => this.addEvent(e, e.start, e.end)}
              // resizable
              style={{ height: "100vh", backgroundColor: "#ffffff" }}
              onSelectEvent={this.onEventClick}
              eventPropGetter={this.eventStyleGetter}
            // 
            />
          </div>

          <div
            className="col-3"
            style={{ background: "white", display: !calander_show && "none" }}
          >
            <button
              className="calander_hide"
              onClick={() => {
                this.setState({ calander_show: false });
              }}
            >
              <ArrowForwardIos />
            </button>
            <ul className="list-group">
              {this.state.physicianData.map((item, index) => {
                return (
                  <>
                    {index === 0 ? (
                      <button
                        className="w-100 btn cc-btn btn-primary mb-2 mt-4"
                        data-toggle="collapse"
                        data-target={`#${item.speciality}`}
                      >
                        {this.state.physicianData[0].speciality}
                      </button>
                    ) : (
                      item.speciality !==
                      this.state.physicianData[index - 1].speciality && (
                        <button
                          className="w-100 btn cc-btn btn-primary mb-2 mt-4"
                          data-toggle="collapse"
                          data-target={
                            item.speciality === "FAMILY PHYSICIAN"
                              ? `#FAMILYPHYSICIAN`
                              : `#${item.speciality}`
                          }
                        >
                          {item.speciality}
                        </button>
                      )
                    )}
                    <div
                      id={
                        item.speciality === "FAMILY PHYSICIAN"
                          ? `FAMILYPHYSICIAN`
                          : `${item.speciality}`
                      }
                      className="collapse"
                    >
                      <CheckBox
                        key={index}
                        name={item.name}
                        handleCheckChildElement={this.handleCheckChildElement}
                        id={item.nationalID}
                        defaultChecked={true}
                        backgroundColor={"#" + item.colorCode}
                      />
                    </div>
                  </>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
export default Scheduler;
