---
title: Law of Demeter (don’t talk to strangers)
date: '2022-10-10'
tags: ['refactoring', 'code smell']
draft: false
summary: Example of a code smell violating the Law of Demeter, why it's problematic, and how to fix it.
---

## Problem

A common pattern you may see in object-oriented code is something like:

```js
const patientValidator = {
  patient,
  assertHasBlueEyes: function () {
    console.assert(this.patient.eyes[0].colour == 'blue')
  },
}
```

This code violates the [Law of Demeter](https://en.wikipedia.org/wiki/Law_of_Demeter), which states that a component/object/unit should only talk to its immediate children, and not its grandchildren or deeper ancestors. In this case, `patientValidator` has been tightly coupled to its grandchildren `patient.eyes[0]` and `patient.eyes[0].colour`, as shown by the orange arrows in the dependency graph below.

![fig1](/static/images/law-of-demeter/fig1.png)

## Solution

To remove this coupling, we can [encapsulate](<https://en.wikipedia.org/wiki/Encapsulation_(computer_programming)>) the access to `eyes` by adding the method `getEyeColour` to `patient`:

```js
const patient = {
  // ...
  getEyeColour: function () {
    return this.eyes[0].colour
  },
}

const patientValidator = {
  patient,
  assertHasBlueEyes: function () {
    console.assert(this.patient.getEyeColour() == 'blue')
  },
}
```

## Benefits

Let's say we are developing a medical app that displays a patient's eye colour for the purposes of identification.

```jsx
// PatientDetails.jsx
<Row label="Eye Colour" value={patient.eyes[0].colour} />
```

Now a new feature needs to be added to the app to measure levels of jaundice and conjunctivitis. `colour` is now an ambiguous term that could refer to either the pupil or the sclera, so we refactor the patient object to eliminate this ambiguity:

```js
const patient = {
  eyes: [
    { pos: 'left', pupilColour: 'blue', scleraColour: 'white' },
    { pos: 'right', pupilColour: 'blue', scleraColour: 'white' },
  ],
}
```

Now we must remember to update all references to `pupil.eyes[#].colour` in our views, models, and tests else we will encounter runtime errors.

If instead we had followed the Law of Demeter, we would only need to change `getEyeColour`:

```js
const patient = {
  eyes: [
    { pos: 'left', pupilColour: 'blue', scleraColour: 'white' },
    { pos: 'right', pupilColour: 'blue', scleraColour: 'white' },
  ],
  getEyeColour: function (eyePart) {
    switch (eyePart) {
      case 'sclera':
        return this.eyes[0].scleraColour
      default:
        return this.eyes[0].pupilColour
    }
  },
}

// PatientDetails.jsx
<Row label="Pupil Colour" value={patient.getEyeColour()} />
<Row label="Sclera Colour" value={patient.getEyeColour('sclera')} />
```

This also makes the `patient` object and `PatientDetails` component easier to test since we only need to stub the `getEyeColour` method and instead of building a correctly-shaped `patient` object. If the shape of `patient` changes, the components/tests do not need to be changed.

## Considerations

As with any principle, there are tradeoffs to this approach. We are adding layer(s) of indirection, so if our code contains a single reference to `a.b.c.d` that we wish to refactor to `a.getD()`, it is probably not worth the extra effort to implement `getD()` inside of `a` and `b` (sometimes known as _lasagna code_).
