---
title: Nominal type safety in TypeScript
date: '2022-10-14'
tags: ['typescript', 'refactoring', 'type safety', 'shift left']
images: ['/static/images/nominal-type-safety-in-typescript/card.png']
draft: false
summary: Catch bugs at compile time using nominal types in TypeScript.
---

## Problem

TypeScript adds structural type-safety to JavaScript, meaning that any types that are structurally the same are interchangeable. For example, `Address`, `ShippingAddress`, and `BillingAddress` in the code below:

```ts
interface Address {
  name: string
  street: string
  city: string
}

type ShippingAddress = Address
type BillingAddress = Address

class CustomerOrder {
  constructor(private shippingAddress: ShippingAddress, private billingAddress: BillingAddress) {}

  checkout(): void {
    this.bill(this.billingAddress)
    this.ship(this.shippingAddress)
  }

  bill = (address: BillingAddress) =>
    console.log(`Billing to ${address.name}, ${address.street}, ${address.city}`)

  ship = (address: ShippingAddress) =>
    console.log(`Shipping to ${address.name}, ${address.street}, ${address.city}`)
}

const bobBillingAddress = {
  name: 'Bob Smith',
  street: '123 Fake St',
  city: 'London',
} as BillingAddress

const bobShippingAddress = {
  name: 'Janet Smith',
  street: '456 Real St',
  city: 'Manchester',
} as ShippingAddress

const bobsOrder = new CustomerOrder(bobBillingAddress, bobShippingAddress)

bobsOrder.checkout()
```

Although this code compiles and will not throw runtime errors, it contains a bug whereby the order will attempt to be billed to `bobShippingAddress` and shipped to `bobBillingAddress`.

## Solution

By refactoring this code to use _nominal types_, we can catch this bug at compile time:

```ts
declare const t: unique symbol
type Nominal<T, U> = T & { readonly [t]: U }

type ShippingAddress = Nominal<Address, 'ShippingAddress'>
type BillingAddress = Nominal<Address, 'BillingAddress'>
```

Now we will encounter a compile error `Argument of type 'BillingAddress' is not assignable to parameter of type 'ShippingAddress'` on line:

```ts
const bobsOrder = new CustomerOrder(bobBillingAddress, bobShippingAddress)
```

After swapping the arguments to fix the compile error, the order will now bill to the billing address and ship to the shipping address.
